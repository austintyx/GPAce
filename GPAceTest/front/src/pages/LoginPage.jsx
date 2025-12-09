import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../pages/LoginPage.css";

export default function LoginPage({ onAuth } = {}) {
    const navigate = useNavigate();
    const [mode, setMode] = useState("choice");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // login form
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);

    // signup form
    const [name, setName] = useState("");
    const [confirm, setConfirm] = useState("");
    const [school, setSchool] = useState("");
    const [course, setCourse] = useState("");

    // List of schools
    const schools = [
        "Nanyang Technological University (NTU)",
        "National University of Singapore (NUS)",
        "Singapore Management University (SMU)",
        "Singapore University of Technology and Design (SUTD)",
        "Singapore Institute of Technology (SIT)",
        "Singapore University of Social Sciences (SUSS)",
        "Sigapore Institute of Management (SIM)",
        "Other"
    ];

    const resetForm = () => {
        setSchool("");
        setCourse("");
        setEmail("");
        setPassword("");
        setName("");
        setConfirm("");
        setRemember(false);
        setError("");
    };

    const validEmail = (e) => /\S+@\S+\.\S+/.test(e);

    const fakeAuth = (result, delay = 700) =>
        new Promise((resolve) => setTimeout(() => resolve(result), delay));

    const handleGuest = async () => {
        setLoading(true);
        setError("");
        try {
            const token = "guest-token-" + Math.random().toString(36).slice(2, 10);
            await fakeAuth({ token, user: { name: "Guest" } });
            localStorage.setItem("auth_token", token);
            if (onAuth) onAuth({ token, user: { name: "Guest" }, guest: true });
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
            const response = await fetch("http://localhost:4000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return setError(errorData.message || "Login failed.");
            }

            const { token, user } = await response.json();
            localStorage.setItem("auth_token", token);
            if (onAuth) onAuth({ token, user, guest: false });
            else console.log("Logged in:", { token, user });
            navigate("/dashboard");
        } catch (err) {
            console.error("Login error:", err);
            setError("Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError("");
        if (!name.trim()) return setError("Enter your name.");
        if (!school) return setError("Select your school.");
        if (!validEmail(email)) return setError("Enter a valid email address.");
        if (password.length < 6) return setError("Password must be at least 6 characters.");
        if (password !== confirm) return setError("Passwords do not match.");

        setLoading(true);
        try {
            const response = await fetch("http://localhost:4000/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, school, course, email,password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return setError(errorData.message || "Signup failed.");
            }

            const { token, user } = await response.json();
            localStorage.setItem("auth_token", token);
            if (onAuth) onAuth({ token, user, guest: false });
            else console.log("Signed up:", { token, user });
            navigate("/dashboard");
        } catch (err) {
            console.error("Signup error:", err);
            setError("Signup failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const ChoiceCard = () => (
        <div className="login-card">
            <h2 className="login-title">Welcome</h2>
            <p className="login-sub">Continue as guest, sign up, or log in to your account.</p>
            <div className="login-row">
                <button className="btn-primary" onClick={() => setMode("login")} disabled={loading}>
                    Log in
                </button>
                <button className="btn-secondary" onClick={() => setMode("signup")} disabled={loading}>
                    Sign up
                </button>
            </div>
            <div className="login-guest-btn">
                <button className="btn-ghost" onClick={handleGuest} disabled={loading}>
                    Continue as Guest
                </button>
            </div>
            {error && <div className="login-error">{error}</div>}
        </div>
    );

    return (
        <div className="login-page">
            {mode === "choice" && <ChoiceCard />}

            {mode === "login" && (
                <div className="login-card">
                    <button className="login-back" onClick={() => { setMode("choice"); resetForm(); }}>&larr; Back</button>
                    <h2 className="login-title">Log in</h2>
                    <form onSubmit={handleLogin} className="login-form">
                        <label className="login-label">
                            Email
                            <input
                                className="login-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </label>
                        <label className="login-label">
                            Password
                            <input
                                className="login-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </label>
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
                    <h2 className="login-title">Sign up</h2>
                    <form onSubmit={handleSignup} className="login-form">
                        <label className="login-label">
                            Full name
                            <input className="login-input" value={name} onChange={(e) => setName(e.target.value)} required />
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
                        <label className="login-label">
                            Email
                            <input
                                className="login-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </label>
                        <label className="login-label">
                            Password
                            <input
                                className="login-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </label>
                        <label className="login-label">
                            Confirm password
                            <input
                                className="login-input"
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                            />
                        </label>
                        <div className="login-row">
                            <button className="btn-primary" type="submit" disabled={loading}>
                                {loading ? "Creating..." : "Create account"}
                            </button>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => {
                                    setMode("login");
                                }}
                                disabled={loading}
                            >
                                Already have an account?
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
        </div>
    );
}