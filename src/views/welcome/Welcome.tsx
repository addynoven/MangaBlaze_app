import { ShareSocial } from '@/components/shared'
import Link from 'next/link'

const WelcomePage = () => {
  return (
    <>
      <div className="welcome-top position-relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div className="welcome-bg position-absolute w-100 h-100 top-0 start-0 z-0">
          <img 
            src="/index.jpg" 
            alt="Background" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(8px) brightness(0.4)', transform: 'scale(1.1)' }} 
          />
          <div className="position-absolute w-100 h-100 top-0 start-0" style={{ background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.2), #0f172a)' }}></div>
        </div>
        <div className="container max-md position-relative z-index-2 text-center text-md-start animate-fade-in">
          <div className="py-5 my-5">
            <h1 className="display-3 fw-bold mb-3" style={{ background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Read Manga Online For Free.
            </h1>
            <h2 className="h4 text-muted fw-normal mb-5 line-height-lg" style={{ maxWidth: '600px' }}>
              Immerse yourself in a premium, lightning-fast reading experience with over 30,000 titles synced across all your devices.
            </h2>
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-md-start">
              <Link
                className="btn btn-lg btn-primary px-5 py-3 fw-bold"
                href="/home"
              >
                <span className="mr-2">Start Reading</span>
                <i className="fa-solid fa-arrow-right"></i>
              </Link>
              <Link
                className="btn btn-lg btn-outline-light px-5 py-3 fw-bold glass-panel"
                href="/browse"
              >
                <span className="mr-2">Browse Sources</span>
                <i className="fa-solid fa-compass"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="welcome-bottom py-5" style={{ background: '#0f172a' }}>
        <div className="container max-md">
          <div className="glass-panel p-4 p-md-5 mx-auto" style={{ maxWidth: '800px' }}>
            <article className="text-muted" style={{ lineHeight: 1.8 }}>
              <div className="mb-5 text-center">
                <ShareSocial />
              </div>
              <h3 className="h4 text-white fw-bold mb-3">
                MangaBlaze - The Ultimate Reader
              </h3>
              <p className="mb-4">
                Are you looking for a platform to <strong className="text-white">read manga online</strong>? Look no further than our
                website! With over 30,000 titles from multiple aggregated sources, we offer an extensive
                collection of manga comics for all readers. Our platform
                provides a user-friendly interface that is easy to navigate and
                explore, so you can quickly find your desired title.
              </p>
              
              <div className="row g-4 my-5">
                <div className="col-md-6">
                  <div className="p-4 bg-secondary-subtle rounded-3 h-100">
                    <h5 className="text-white fw-bold"><i className="fa-solid fa-shield-halved text-primary mr-2"></i> Safe to use</h5>
                    <p className="mb-0 small">
                      We understand how annoying it is to deal with pop-up ads and
                      unwanted distractions. Our platform is entirely safe to use and free of disruptive advertisements.
                    </p>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-4 bg-secondary-subtle rounded-3 h-100">
                    <h5 className="text-white fw-bold"><i className="fa-solid fa-bolt text-warning mr-2"></i> Smart features</h5>
                    <p className="mb-0 small">
                      We offer a smart and convenient sync feature that allows
                      you to access your content on both your PC and mobile devices.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mb-0">
                In conclusion, our website offers an extensive collection of
                high-quality manga comics with a premium interface, smart
                features, and zero pop-up ads. We aim to make your manga reading
                experience an enjoyable and hassle-free one.
              </p>
            </article>
          </div>
        </div>
      </div>
    </>
  )
}

export default WelcomePage
