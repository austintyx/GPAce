import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSignup } from "../hooks/useSignup";
import { AUTH_API_URL } from "../config/api";
import { EyeIcon, EyeOffIcon, ArrowRightIcon, SparkleIcon } from "../components/Icons";
import "../pages/LoginPage.css";

// Defined outside LoginPage so it keeps a stable component identity across
// re-renders. Defining it inside the function body would recreate the
// component type on every keystroke, forcing React to unmount/remount the
// <input> each time — which is what was triggering the browser's
// "save password?" prompt on every character typed.
function PasswordField({ label, value, onChange, visible, onToggle, autoComplete, id }) {
    return (
        <label className="login-label" htmlFor={id}>
            {label}
            <div className="password-field">
                <input
                    id={id}
                    name={id}
                    className="login-input"
                    type={visible ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    autoComplete={autoComplete}
                    required
                />
                <button
                    type="button"
                    className="password-toggle"
                    onClick={onToggle}
                    tabIndex={-1}
                    aria-label={visible ? "Hide password" : "Show password"}
                >
                    {visible ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
                </button>
            </div>
        </label>
    );
}

function ChoiceCard({ loading, error, onLogin, onSignup, onGuest }) {
    return (
        <div className="login-card">
            <h2 className="login-title">Welcome back</h2>
            <p className="login-sub">Continue as guest, sign up, or log in to your account.</p>
            <div className="login-row">
                <button className="btn-primary" onClick={onLogin} disabled={loading}>
                    Log in
                </button>
                <button className="btn-secondary" onClick={onSignup} disabled={loading}>
                    Sign up
                </button>
            </div>
            <div className="login-guest-btn">
                <button className="btn-ghost" onClick={onGuest} disabled={loading}>
                    {loading ? "Starting session..." : "Continue as Guest"}
                </button>
            </div>
            {error && <div className="login-error">{error}</div>}
        </div>
    );
}

export default function LoginPage({ onAuth } = {}) {
    const navigate = useNavigate();
    const [mode, setMode] = useState("choice");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // login form
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);

    // signup form
    const [name, setName] = useState("");
    const [confirm, setConfirm] = useState("");
    const [school, setSchool] = useState("");
    const [course, setCourse] = useState("");
    const [isDoubleDegree, setIsDoubleDegree] = useState(false);
    const [secondaryDegreeName, setSecondaryDegreeName] = useState("");

    const { handleSignup: signup, loading: signupLoading, error: signupError, setError: setSignupError } = useSignup();

    // List of schools
    const schools = [
        "Nanyang Technological University (NTU)",
        "National University of Singapore (NUS)",
        "Singapore Management University (SMU)",
        "Singapore University of Technology and Design (SUTD)",
        "Singapore Institute of Technology (SIT)",
        "Singapore University of Social Sciences (SUSS)",
        "Singapore Institute of Management (SIM)",
        "Other"
    ];

    const resetForm = () => {
        setSchool("");
        setEmail("");
        setPassword("");
        setName("");
        setConfirm("");
        setCourse("");
        setIsDoubleDegree(false);
        setSecondaryDegreeName("");
        setRemember(false);
        setError("");
        setSignupError("");
        setShowPassword(false);
        setShowConfirm(false);
    };

    const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    const fakeAuth = (result, delay = 700) =>
        new Promise((resolve) => setTimeout(() => resolve(result), delay));

    const handleGuest = async () => {
        setLoading(true);
        setError("");
        try {
            const token = "guest-token-" + Math.random().toString(36).slice(2, 10);
            const guestUser = { name: "Guest" };
            await fakeAuth({ token, user: guestUser });
            localStorage.setItem("auth_token", token);
            localStorage.setItem("auth_user", JSON.stringify(guestUser));
            localStorage.setItem("auth_guest", "true");
            if (onAuth) onAuth({ token, user: guestUser, guest: true });
            else console.log("Authenticated as guest:", token);
            navigate("/dashboard");
        } catch (e) {
            setError("Unable to start guest session.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        if (!validEmail(email)) return setError("Enter a valid email address.");
        if (!password) return setError("Enter your password.");

        setLoading(true);
        try {
            const response = await fetch(`${AUTH_API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return setError(errorData.message || "Login failed.");
            }

            const { token, user } = await response.json();
            localStorage.setItem("auth_token", token);
            localStorage.setItem("auth_user", JSON.stringify(user));
            localStorage.setItem("auth_guest", "false");
            if (onAuth) onAuth({ token, user, guest: false });
            else console.log("Logged in:", { token, user });
            navigate("/dashboard");
        } catch (err) {
            console.error("Login error:", err);
            setError("Login failed. Check that the backend is running on port 4000.");
        } finally {
            setLoading(false);
        }
    };

    const onSignupSubmit = (e) => {
        e.preventDefault();
        signup({
            name,
            school,
            course,
            email,
            password,
            confirm,
            isDoubleDegree,
            primaryDegreeName: course,
            secondaryDegreeName,
            onAuth
        });
    };

    return (
        <div className="login-page">
            <div className="login-glow" aria-hidden="true" />

            <div className="login-shell">
                <aside className="login-aside">
                    <Link to="/" className="login-aside-brand">
                        GP<span className="ace-accent">Ace</span>
                    </Link>
                    <div className="login-aside-copy">
                        <span className="login-aside-eyebrow">
                            <SparkleIcon width={14} height={14} /> Free to try, no card needed
                        </span>
                        <h1>Plan the grades that get you to your target GPA.</h1>
                        <p>Import your transcript, set a goal, and GPAce works out exactly what you need on every module that's left.</p>
                    </div>
                    <ul className="login-aside-points">
                        <li>Live GPA dashboard with editable modules</li>
                        <li>PDF transcript &amp; curriculum import</li>
                        <li>Double degree support built in</li>
                    </ul>
                </aside>

                <div className="login-form-area">
                    {mode === "choice" && (
                        <ChoiceCard
                            loading={loading}
                            error={error}
                            onLogin={() => setMode("login")}
                            onSignup={() => setMode("signup")}
                            onGuest={handleGuest}
                        />
                    )}

                    {mode === "login" && (
                        <div className="login-card">
                            <button className="login-back" onClick={() => { setMode("choice"); resetForm(); }}>&larr; Back</button>
                            <h2 className="login-title">Log in</h2>
                            <p className="login-sub">Welcome back &mdash; enter your details to continue.</p>
                            <form onSubmit={handleLogin} className="login-form">
                                <label className="login-label">
                                    Email
                                    <input
                                        className="login-input"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                    />
                                </label>
                                <PasswordField
                                    id="login-password"
                                    label="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    visible={showPassword}
                                    onToggle={() => setShowPassword((v) => !v)}
                                    autoComplete="current-password"
                                />
                                <label className="login-checkbox">
                                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                                    <span>Remember me</span>
                                </label>
                                <div className="login-row">
                                    <button className="btn-primary" type="submit" disabled={loading}>
                                        {loading ? "Signing in..." : "Sign in"}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => {
                                            setMode("signup");
                                        }}
                                        disabled={loading}
                                    >
                                        Create account
                                    </button>
                                </div>
                                <div className="login-guest-btn">
                                    <button className="btn-ghost" type="button" onClick={handleGuest} disabled={loading}>
                                        Continue as Guest
                                    </button>
                                </div>
                                {error && <div className="login-error">{error}</div>}
                            </form>
                        </div>
                    )}

                    {mode === "signup" && (
                        <div className="login-card">
                            <button className="login-back" onClick={() => { setMode("choice"); resetForm(); }}>&larr; Back</button>
                            <h2 className="login-title">Create your account</h2>
                            <p className="login-sub">Takes less than a minute &mdash; no credit card required.</p>
                            <form onSubmit={onSignupSubmit} className="login-form">
                                <label className="login-label">
                                    Full name
                                    <input className="login-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                                </label>
                                <label className="login-label">
                                    School
                                    <select
                                        className="login-input"
                                        value={school}
                                        onChange={(e) => setSchool(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Select your school --</option>
                                        {schools.map((schoolName) => (
                                            <option key={schoolName} value={schoolName}>
                                                {schoolName}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="login-label">
                                    Course
                                    <input
                                        className="login-input"
                                        value={course}
                                        onChange={(e) => setCourse(e.target.value)}
                                        required
                                    />
                                </label>
                                <label className="login-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={isDoubleDegree}
                                        onChange={(e) => setIsDoubleDegree(e.target.checked)}
                                    />
                                    <span>I am studying a double degree</span>
                                </label>
                                {isDoubleDegree && (
                                    <label className="login-label">
                                        Second degree
                                        <input
                                            className="login-input"
                                            value={secondaryDegreeName}
                                            onChange={(e) => setSecondaryDegreeName(e.target.value)}
                                            placeholder="Example: Computer Science"
                                            required
                                        />
                                    </label>
                                )}
                                <label className="login-label">
                                    Email
                                    <input
                                        className="login-input"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                    />
                                </label>
                                <PasswordField
                                    id="signup-password"
                                    label="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    visible={showPassword}
                                    onToggle={() => setShowPassword((v) => !v)}
                                    autoComplete="new-password"
                                />
                                <PasswordField
                                    id="signup-confirm-password"
                                    label="Confirm password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    visible={showConfirm}
                                    onToggle={() => setShowConfirm((v) => !v)}
                                    autoComplete="new-password"
                                />
                                <div className="login-row">
                                    <button className="btn-primary" type="submit" disabled={signupLoading}>
                                        {signupLoading ? "Creating..." : (<>Create account <ArrowRightIcon width={16} height={16} /></>)}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => {
                                            setMode("login");
                                        }}
                                        disabled={signupLoading}
                                    >
                                        Already have an account?
                                    </button>
                                </div>
                                <div className="login-guest-btn">
                                    <button className="btn-ghost" type="button" onClick={handleGuest} disabled={signupLoading}>
                                        Continue as Guest
                                    </button>
                                </div>
                                {signupError && <div className="login-error">{signupError}</div>}
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
