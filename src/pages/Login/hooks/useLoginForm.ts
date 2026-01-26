import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { type ApiError } from "@/lib/api/client";

function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" && err !== null &&
    "status" in err && "message" in err
  );
}

export function useLoginForm() {
  const [apikey, setApikey] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!apikey.trim()) {
      setError("API Key is required");
      setIsLoading(false);
      return;
    }

    try {
      // Login with just API key (username/password are not required)
      await login({ username: "", password: "", apikey });
      navigate("/");
    } catch (err) {
      if (isApiError(err)) {
        setError(err.message);
      } else {
        setError("Invalid API key");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    apikey,
    setApikey,
    error,
    isLoading,
    handleSubmit,
  };
}
