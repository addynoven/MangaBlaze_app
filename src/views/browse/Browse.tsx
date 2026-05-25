"use client";

import { sourceList } from "@/lib/sources";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { togglePinSource } from "@/store/slices/library/librarySlice";
import Link from "next/link";
import { useState, useEffect } from "react";
import classNames from "classnames";

interface SourceHealthData {
  sourceId: string;
  status: "online" | "offline" | "slow" | "unknown";
  lastLatency: number;
  errorCount: number;
  lastError?: string;
}

const getGradient = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color1 = `hsl(${Math.abs(hash % 360)}, 70%, 60%)`;
  const color2 = `hsl(${Math.abs((hash + 40) % 360)}, 70%, 40%)`;
  return `linear-gradient(135deg, ${color1}, ${color2})`;
};

const getInitials = (name: string) => {
  return name.substring(0, 2).toUpperCase();
};

const Browse = () => {
  const [search, setSearch] = useState("");
  const [healthData, setHealthData] = useState<
    Record<string, SourceHealthData>
  >({});
  const dispatch = useAppDispatch();
  const pinnedSources = useAppSelector((state) => state.library.pinnedSources);

  useEffect(() => {
    fetch("/api/source/health")
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          const healthMap = res.data.reduce(
            (acc: Record<string, SourceHealthData>, item: SourceHealthData) => {
              acc[item.sourceId] = item;
              return acc;
            },
            {},
          );
          setHealthData(healthMap);
        }
      })
      .catch(() => {});
  }, []);

  const filteredSources = sourceList
    .filter((source) =>
      source.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const aPinned = pinnedSources.includes(a.id);
      const bPinned = pinnedSources.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.name.localeCompare(b.name);
    });

  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(togglePinSource(id));
  };

  return (
    <div className="container py-5">
      <style>{`
        .source-card {
          background-color: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          position: relative;
        }
        .source-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 2px;
          background: var(--gradient-primary);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .source-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.4);
        }
        .source-card:hover::before {
          opacity: 1;
        }
        .source-avatar {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 4px 10px rgba(0,0,0,0.2), inset 0 2px 5px rgba(255,255,255,0.1);
          position: relative;
          overflow: hidden;
        }
        .source-avatar::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%);
          transform: rotate(45deg);
        }
        .search-container {
          background: #151e2e;
          border-radius: 12px;
          padding: 0.5rem;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .search-container input {
          background: transparent !important;
          border: none !important;
          color: white !important;
          box-shadow: none !important;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px currentColor;
        }
        .pin-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .pin-btn:hover {
          background: rgba(255,255,255,0.1);
        }
      `}</style>

      <div className="row align-items-center mb-5">
        <div className="col-md-6 mb-3 mb-md-0">
          <h2 className="mb-1 fw-bold">
            <span className="text-primary">Manga</span> Sources
          </h2>
          <p className="text-muted mb-0">
            Browse and manage your reading extensions
          </p>
        </div>
        <div className="col-md-6">
          <div className="search-container glass-panel d-flex align-items-center px-3 py-1">
            <i className="fa-solid fa-magnifying-glass text-muted"></i>
            <input
              type="text"
              className="form-control bg-transparent border-0 text-white shadow-none focus-ring-0"
              placeholder="Search by name or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="row g-4 animate-fade-in">
        {filteredSources.map((source) => {
          const isPinned = pinnedSources.includes(source.id);
          const health = healthData[source.id];
          const status = health?.status || "unknown";

          return (
            <div key={source.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
              <div className="position-relative h-100">
                <Link
                  href={`/browse/${source.id}`}
                  className="card source-card text-decoration-none h-100"
                >
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div
                        className="source-avatar"
                        style={{ background: getGradient(source.name) }}
                      >
                        {source.type === "api" ? (
                          <i className="fa-solid fa-cloud-bolt"></i>
                        ) : (
                          <i className="fa-solid fa-spider-web"></i>
                        )}
                      </div>
                      <div className="d-flex flex-column align-items-end">
                        <span
                          className={classNames(
                            "badge mb-2",
                            source.type === "api"
                              ? "bg-primary"
                              : "bg-secondary text-white",
                          )}
                        >
                          {source.type.toUpperCase()}
                        </span>
                        <div className="d-flex align-items-center gap-2 small">
                          {(health?.lastLatency ?? 0) > 0 && (
                            <span className="text-muted">
                              <i className="fa-solid fa-bolt-lightning text-warning mr-1"></i>
                              {health?.lastLatency}ms
                            </span>
                          )}
                          <span
                            className={classNames(
                              "status-dot",
                              status === "online"
                                ? "bg-success text-success"
                                : status === "offline"
                                  ? "bg-danger text-danger"
                                  : status === "slow"
                                    ? "bg-warning text-warning"
                                    : "bg-secondary text-secondary",
                            )}
                            title={`Status: ${status}`}
                          ></span>
                        </div>
                      </div>
                    </div>

                    <h5
                      className="card-title mb-1 text-white fw-bold text-truncate"
                      title={source.name}
                    >
                      {source.name}
                    </h5>
                    <p className="text-muted small mb-0">
                      {isPinned ? "Pinned to library" : "Available extension"}
                    </p>
                  </div>
                </Link>

                <button
                  onClick={(e) => handleTogglePin(e, source.id)}
                  className={classNames(
                    "btn btn-link pin-btn position-absolute text-decoration-none",
                    isPinned ? "text-primary" : "text-muted",
                  )}
                  style={{ bottom: "16px", right: "16px" }}
                  title={isPinned ? "Unpin source" : "Pin source"}
                >
                  <i
                    className={classNames(
                      "fa-solid fa-thumbtack",
                      !isPinned && "fa-rotate-by",
                    )}
                    style={!isPinned ? { transform: "rotate(45deg)" } : {}}
                  ></i>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Browse;
