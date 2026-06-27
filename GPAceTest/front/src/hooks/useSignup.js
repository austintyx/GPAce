import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AUTH_API_URL } from "../config/api";

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function useSignup() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSignup = async ({ name, school, course, email, password, confirm, isDoubleDegree, primaryDegreeName, secondaryDegreeName, onAuth }) => {
        setError("");

        if (!name.trim()) return setError("Enter your full name.");
        if (!school) return setError("Select your school.");
        if (!course.trim()) return setError("Enter your course.");
        if (isDoubleDegree && !secondaryDegreeName.trim()) return setError("Enter your second degree.");
        if (!validEmail(email)) return setError("Enter a valid email address.");
        if (!password) return setError("Enter your password.");
        if (password !== confirm) return setError("Passwords do not match.");

        setLoading(true);

        try {
            const response = await fetch(`${AUTH_API_URL}/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    school,
                    course,
                    email,
                    password,
                    isDoubleDegree,
                    primaryDegreeName: primaryDegreeName || course,
                    secondaryDegreeName
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                return setError(data.message || "Signup failed.");
            }

            localStorage.setItem("auth_token", data.token);
            localStorage.setItem("auth_user", JSON.stringify(data.user));
            localStorage.setItem("auth_guest", "false");

            if (onAuth) {
                onAuth({ token: data.token, user: data.user, guest: false });
            }

            navigate("/dashboard");
        } catch (err) {
            console.error("Signup error:", err);
            setError("Signup failed. Check that the backend is running on port 4000.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSignup, loading, error, setError };
}
