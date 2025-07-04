import { useParams } from "wouter";
import { ContactLayout } from "@/components/ContactLayout";
import { AnamnesisManager } from "@/components/AnamnesisManager";

export default function ContatoAnamneses() {
  const { id } = useParams<{ id: string }>();
  const contactId = parseInt(id || '0');

  return (
    <ContactLayout currentTab="anamneses">
      <div id="anamnesis" className="p-6">
        <AnamnesisManager contactId={contactId} />
      </div>
    </ContactLayout>
  );
}