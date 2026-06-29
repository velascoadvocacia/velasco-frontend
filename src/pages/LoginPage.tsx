import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import logoVelasco from "../icons/VELASCO-MARCA-1-1024x190.png";

export function LoginPage() {
  const { isAuthenticated, isAdmin, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("admin");
  const [senha, setSenha] = useState("Admin@123456");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(username, senha);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || "/", { replace: true });
    } catch (submissionError) {
      if (submissionError instanceof ApiError) {
        setError(submissionError.message);
      } else {
        setError("Não foi possível autenticar com a API.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-layout">
      <section className="login-hero">
        <img className="login-logo" src={logoVelasco} alt="Velasco Advocacia" />
      </section>

      <section className="login-card">
        <div className="login-card-header">
          <h2>Entrar</h2>
          <p>Autenticação JWT consumindo `/auth/login`.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Usuário
            <input value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>

          <label>
            Senha
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  color: "#666"
                }}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </label>

          {error ? <div className="error-banner">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Autenticando..." : "Acessar painel"}
          </button>
        </form>
      </section>
    </div>
  );
}
