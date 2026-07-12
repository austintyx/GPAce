import { Link } from "react-router-dom";
import "../pages/WelcomePage.css";
import {
    CalculatorIcon,
    UploadIcon,
    PlannerIcon,
    TargetIcon,
    LayersIcon,
    DashboardIcon,
    SparkleIcon,
    ArrowRightIcon,
    CheckIcon
} from "../components/Icons";

const features = [
    {
        icon: DashboardIcon,
        title: "One dashboard for every module",
        text: "See your live GPA, credits attempted, and completion status update the moment you edit a grade."
    },
    {
        icon: UploadIcon,
        title: "Transcript import",
        text: "Upload a PDF transcript and GPAce parses your modules, grades, credits, and academic year automatically."
    },
    {
        icon: LayersIcon,
        title: "Curriculum import",
        text: "Bring in your programme structure to pre-plan every module you still need to take, semester by semester."
    },
    {
        icon: PlannerIcon,
        title: "Drag-and-drop course planner",
        text: "Arrange modules across semesters visually, rename terms, and keep your degree roadmap up to date."
    },
    {
        icon: TargetIcon,
        title: "Grade plan permutations",
        text: "Set a target GPA and get several realistic routes to reach it based on the credits you have left."
    },
    {
        icon: CalculatorIcon,
        title: "FGO Planner",
        text: "Optimise which modules to convert to pass/fail within your AU limits to protect your GPA the smart way."
    }
];

const steps = [
    {
        step: "01",
        title: "Start free, no card needed",
        text: "Continue as a guest to try it instantly, or sign up to save your data and unlock PDF import."
    },
    {
        step: "02",
        title: "Bring in your modules",
        text: "Import your transcript and curriculum, or add modules by hand. Double degree? GPAce tracks both."
    },
    {
        step: "03",
        title: "Set your target GPA",
        text: "Slide to your goal and GPAce works out the required average for every credit you have left."
    },
    {
        step: "04",
        title: "Plan the rest of your degree",
        text: "Use the course planner and FGO planner to lock in a route that gets you there."
    }
];

export default function WelcomePage() {
    return (
        <div className="landing">
            <div className="landing-glow" aria-hidden="true" />

            <nav className="landing-nav">
                <div className="landing-brand">
                    <span className="brand-word">GP<span className="ace-accent">Ace</span></span>
                </div>
                <div className="landing-nav-links">
                    <a href="#features">Features</a>
                    <a href="#how-it-works">How it works</a>
                </div>
                <div className="landing-nav-actions">
                    <Link className="nav-login-link" to="/login">Log in</Link>
                    <Link className="btn-primary btn-nav" to="/login">Get started</Link>
                </div>
            </nav>

            <header className="hero">
                <div className="hero-copy">
                    <span className="eyebrow">
                        <SparkleIcon width={14} height={14} /> Built for students, not spreadsheets
                    </span>
                    <h1>
                        Know your GPA.<br />
                        Plan the grades<br />
                        that get you there.
                    </h1>
                    <p className="hero-sub">
                        GPAce turns your transcript into a live dashboard, then tells you exactly
                        what you need on every remaining module to hit your target GPA &mdash; down
                        to the last credit.
                    </p>
                    <div className="hero-actions">
                        <Link className="btn-primary btn-lg" to="/login">
                            Get started free <ArrowRightIcon width={18} height={18} />
                        </Link>
                        <a className="btn-ghost btn-lg" href="#how-it-works">
                            See how it works
                        </a>
                    </div>
                    <div className="hero-trust">
                        <div className="hero-trust-avatars" aria-hidden="true">
                            <span /><span /><span />
                        </div>
                        <p>Preloaded grading scales for NTU, NUS, SMU, SUTD, SIT, SUSS &amp; SIM students.</p>
                    </div>
                </div>

                <div className="hero-visual" aria-hidden="true">
                    <div className="mock-card mock-card-main">
                        <div className="mock-card-header">
                            <span>CURRENT GPA</span>
                            <span className="mock-pill">5.0 scale</span>
                        </div>
                        <div className="mock-value">4.62</div>
                        <div className="mock-bar">
                            <div className="mock-bar-fill" style={{ width: "84%" }} />
                        </div>
                        <div className="mock-subtitle">Based on 96 completed credits</div>
                    </div>
                    <div className="mock-card mock-card-float mock-card-required">
                        <div className="mock-card-header">
                            <span>REQUIRED AVERAGE</span>
                        </div>
                        <div className="mock-value mock-value-sm">4.80</div>
                        <div className="mock-subtitle">Across 18 future credits</div>
                    </div>
                    <div className="mock-card mock-card-float mock-card-module">
                        <div className="mock-module-row">
                            <span className="mock-code">CZ2002</span>
                            <span className="mock-grade">A-</span>
                        </div>
                        <div className="mock-module-row">
                            <span className="mock-code">MH2500</span>
                            <span className="mock-grade">A</span>
                        </div>
                        <div className="mock-module-row mock-module-row-muted">
                            <span className="mock-code">SC1004</span>
                            <span className="mock-grade">Planned</span>
                        </div>
                    </div>
                </div>
            </header>

            <section className="strip" aria-label="Highlights">
                <div className="strip-item"><CheckIcon width={16} height={16} /> Free guest mode, no signup required</div>
                <div className="strip-item"><CheckIcon width={16} height={16} /> Double degree GPA tracking</div>
                <div className="strip-item"><CheckIcon width={16} height={16} /> PDF transcript &amp; curriculum import</div>
            </section>

            <section id="features" className="features">
                <div className="section-heading">
                    <span className="section-eyebrow">Features</span>
                    <h2>Everything your GPA spreadsheet was missing</h2>
                    <p>Six tools that work together, so you always know where you stand and what's next.</p>
                </div>
                <div className="feature-grid">
                    {features.map(({ icon: Icon, title, text }) => (
                        <article className="feature-card" key={title}>
                            <div className="feature-icon"><Icon /></div>
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section id="how-it-works" className="how-it-works-section">
                <div className="section-heading">
                    <span className="section-eyebrow">How it works</span>
                    <h2>From transcript to target GPA in four steps</h2>
                </div>
                <div className="steps-grid">
                    {steps.map(({ step, title, text }) => (
                        <div className="step-card" key={step}>
                            <span className="step-number">{step}</span>
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="cta-banner">
                <div className="cta-glow" aria-hidden="true" />
                <h2>Stop guessing what you need on your finals.</h2>
                <p>Set a target GPA and let GPAce work backwards from there.</p>
                <Link className="btn-accent btn-lg" to="/login">
                    Get started free <ArrowRightIcon width={18} height={18} />
                </Link>
            </section>

            <footer className="landing-footer">
                <div className="landing-brand footer-brand">
                    <span className="brand-word">GP<span className="ace-accent">Ace</span></span>
                </div>
                <p>The GPA calculator and academic planner built for students.</p>
                <div className="footer-links">
                    <a href="#features">Features</a>
                    <a href="#how-it-works">How it works</a>
                    <Link to="/login">Log in</Link>
                </div>
                <p className="footer-copy">&copy; {new Date().getFullYear()} GPAce.</p>
            </footer>
        </div>
    );
}
