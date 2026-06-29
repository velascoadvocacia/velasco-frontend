import { AppShell } from "../components/AppShell";
import { PartyForm } from "../components/PartyForm";
import { useAuth } from "../context/AuthContext";

export function DefendantRegistrationPage() {
  const { session } = useAuth();

  if (!session) return null;

  return (
    <AppShell
      title="Cadastro de reclamada"
      subtitle="Tela completa para cadastrar a parte reclamada com todos os dados previstos no backend."
    >
      <PartyForm
        token={session.token}
        roleLabel="Reclamada"
        tipoPessoa="JURIDICA"
        title="Dados da reclamada"
        description="Cadastro completo da parte reclamada, incluindo dados empresariais, documentos e endereço."
        successMessage="Reclamada cadastrada com sucesso."
      />
    </AppShell>
  );
}
