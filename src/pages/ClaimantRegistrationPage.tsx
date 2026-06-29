import { AppShell } from "../components/AppShell";
import { PartyForm } from "../components/PartyForm";
import { useAuth } from "../context/AuthContext";

export function ClaimantRegistrationPage() {
  const { session } = useAuth();

  if (!session) return null;

  return (
    <AppShell
      title="Cadastro de reclamante"
      subtitle="Tela completa para cadastrar a parte autora com todos os dados previstos no backend."
    >
      <PartyForm
        token={session.token}
        roleLabel="Reclamante"
        tipoPessoa="FISICA"
        title="Dados do reclamante"
        description="Cadastro completo da parte autora, incluindo documentos, dados pessoais e endereço."
        successMessage="Reclamante cadastrado com sucesso."
      />
    </AppShell>
  );
}
