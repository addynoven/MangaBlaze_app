import { useState, useEffect } from "react";
import classNames from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import NavMobile from "./NavMobile";
import Modal, { Forgot, Login, Register } from "@/components/ui/Modal";
import { MODAL_AUTH_ENUM } from "@/@types/modal";
import { useClickOutside } from "@/utils/hooks";
import {
  addSearchToHistory,
  clearSearchHistory,
} from "@/store/slices/library/librarySlice";

const Header = () => {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const pinnedSources = useAppSelector((state) => state.library.pinnedSources);
  const searchHistory = useAppSelector((state) => state.library.searchHistory);
  const unreadUpdates = useAppSelector((state) => state.library.unreadUpdates);

  const [openSearch, setOpenSearch] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [openNav, setOpenNav] = useState(false);
  const [toggleMenu, setToggleMenu] = useState<"type" | "genre" | null>(null);
  const [openModal, setOpenModal] = useState(MODAL_AUTH_ENUM.CLOSE);
  const [isOffline, setIsOffline] = useState(false);

  // Extract sourceId if we are in a browse route
  const sourceMatch = pathname.match(/\/browse\/([^/]+)/);
  const currentSourceId = sourceMatch ? sourceMatch[1] : null;

  const searchSources = currentSourceId || pinnedSources.join(",");

  const navRef = useClickOutside(() => handleCloseNav());

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (keyword.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      // Suggest from the first pinned source for speed
      const suggestSource = currentSourceId || pinnedSources[0] || "mangadex";
      fetch(
        `/api/manga/suggest?q=${encodeURIComponent(keyword)}&source=${suggestSource}`,
      )
        .then((res) => res.json())
        .then((res) => setSuggestions(res.data || []))
        .catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword, currentSourceId, pinnedSources]);

  const handleOpen = () => setOpenSearch(true);
  const handleClose = () => {
    setOpenSearch(false);
    setKeyword("");
  };

  const handleToggleNav = () => setOpenNav((prev) => !prev);
  const handleCloseNav = () => {
    setOpenNav(false);
    handleToggle(null);
  };

  const handleOpenModal = (type: MODAL_AUTH_ENUM) => {
    setOpenModal(type);
  };
  const handleCloseModal = () => setOpenModal(MODAL_AUTH_ENUM.CLOSE);

  const handleToggle = (value: "type" | "genre" | null) =>
    setToggleMenu((prev) => (value === null || value === prev ? null : value));

  const handleSearchSubmit = (e: React.FormEvent) => {
    if (keyword.trim()) {
      dispatch(addSearchToHistory(keyword));
    }
  };

  return (
    <>
      <header
        id="header"
        className="sticky-top w-100 z-50 transition-all pt-3"
        style={
          openSearch
            ? { backdropFilter: "none", background: "transparent" }
            : { background: "transparent" }
        }
      >
        <div className="container">
          <div className="component glass-pill px-4 py-2 d-flex align-items-center justify-content-between">
            <div ref={navRef}>
              <button
                id="nav-menu-btn"
                className="btn nav-btn"
                onClick={handleToggleNav}
              >
                <i className="fa-regular fa-bars fa-lg"></i>
              </button>
              <NavMobile openNav={openNav} onCloseNav={handleCloseNav} />
            </div>
            <Link href="/home" className="logo">
              <img src="/logo.png" alt="MangaFire" />
            </Link>
            <div id="nav-menu">
              <ul>
                <li>
                  <Link href="/home">Library</Link>
                </li>
                <li className="position-relative">
                  <Link href="/updates">
                    Updates
                    {unreadUpdates.length > 0 && (
                      <span
                        className="position-absolute translate-middle badge rounded-pill bg-danger"
                        style={{
                          top: 10,
                          right: -10,
                          fontSize: 10,
                          padding: "4px 6px",
                        }}
                      >
                        {unreadUpdates.length > 9 ? "9+" : unreadUpdates.length}
                      </span>
                    )}
                  </Link>
                </li>
                <li>
                  <Link href="/browse">Browse</Link>
                </li>
                <li>
                  <Link href="/history">History</Link>
                </li>
                <li>
                  <Link href="/random" title="Random Manga">
                    <i className="mr-1 fa-regular fa-shuffle"></i> Random
                  </Link>
                </li>
              </ul>
            </div>
            <div id="nav-search" className={classNames(openSearch && "active")}>
              <div className="overlay" onClick={handleClose}></div>
              <div className="search-inner">
                <form
                  action="/filter"
                  autoComplete="off"
                  onSubmit={handleSearchSubmit}
                >
                  <i className="fa-regular fa-magnifying-glass text-muted mr-1"></i>
                  <input
                    type="text"
                    placeholder="Search manga..."
                    name="keyword"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  {searchSources && (
                    <input type="hidden" name="source" value={searchSources} />
                  )}
                  <Link href="/filter" className="btn btn-primary2">
                    <i className="fa-regular fa-circles-overlap fa-xs"></i>
                    <span>Filter</span>
                  </Link>
                </form>

                {/* Suggestions Dropdown */}
                {openSearch &&
                  (keyword.length > 0 || searchHistory.length > 0) && (
                    <div
                      className="suggestion active"
                      style={{
                        display: "block",
                        background: "#1a1a1a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "0 0 8px 8px",
                        overflow: "hidden",
                      }}
                    >
                      {/* Recent History */}
                      {keyword.length === 0 && searchHistory.length > 0 && (
                        <div className="history-section">
                          <div className="p-2 small text-muted uppercase fw-bold border-bottom border-white/5 d-flex justify-content-between">
                            Recent Searches
                            <button
                              className="btn btn-link btn-sm p-0 text-muted"
                              onClick={() => dispatch(clearSearchHistory())}
                            >
                              Clear
                            </button>
                          </div>
                          {searchHistory.map((item, i) => (
                            <Link
                              key={i}
                              href={`/filter?keyword=${encodeURIComponent(item)}&source=${searchSources}`}
                              className="d-block p-2 text-white text-decoration-none hover:bg-white/5"
                              onClick={handleClose}
                            >
                              <i className="fa-regular fa-clock mr-2 text-muted"></i>
                              {item}
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Instant Matches */}
                      {suggestions.length > 0 && (
                        <div className="matches-section">
                          <div className="p-2 small text-muted uppercase fw-bold border-bottom border-white/5">
                            Instant Matches
                          </div>
                          {suggestions.map((item) => (
                            <Link
                              key={item.id}
                              href={`/manga/${item.id}?source=${item.source}`}
                              className="d-flex align-items-center p-2 text-white text-decoration-none hover:bg-white/5 border-bottom border-white/5"
                              onClick={handleClose}
                            >
                              <img
                                src={item.cover}
                                alt=""
                                style={{
                                  width: 40,
                                  height: 50,
                                  objectFit: "cover",
                                  borderRadius: 4,
                                  marginRight: 12,
                                }}
                              />
                              <div className="text-truncate">
                                <div className="fw-bold">{item.title}</div>
                                <div className="small text-muted">
                                  {item.source.toUpperCase()}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>
            <button
              onClick={handleOpen}
              id="nav-search-btn"
              className="btn nav-btn"
            >
              <i className="fa-regular fa-magnifying-glass"></i>
            </button>
            <div className="nav-user" id="user">
              {isOffline && (
                <span className="badge bg-danger mr-3 d-none d-md-inline-block shadow-sm">
                  <i className="fa-solid fa-wifi-slash mr-1"></i> Offline
                </span>
              )}
              <button
                onClick={() => handleOpenModal(MODAL_AUTH_ENUM.LOGIN)}
                className="btn btn-primary rounded-pill"
              >
                <span className="d-none d-sm-inline pl-1 mr-1">Login</span>
                <i className="d-inline d-sm-none fa-solid fa-user-vneck"></i>
                <i className="d-none d-sm-inline fa-solid fa-sm fa-angle-right"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <Modal
        open={openModal === MODAL_AUTH_ENUM.LOGIN}
        onClose={handleCloseModal}
      >
        <Login onOpen={handleOpenModal} />
      </Modal>
      <Modal
        open={openModal === MODAL_AUTH_ENUM.REGISTER}
        onClose={handleCloseModal}
      >
        <Register onOpen={handleOpenModal} />
      </Modal>
      <Modal
        open={openModal === MODAL_AUTH_ENUM.FORGOT}
        onClose={handleCloseModal}
      >
        <Forgot onOpen={handleOpenModal} />
      </Modal>
    </>
  );
};

export default Header;
