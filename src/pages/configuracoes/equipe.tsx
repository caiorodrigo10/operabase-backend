import { UserManagement } from '@/components/UserManagement';
import { ConfiguracoesLayout } from './index';

export default function EquipePage() {
  return (
    <ConfiguracoesLayout>
      <div className="space-y-6">
        <UserManagement clinicId={1} />
      </div>
    </ConfiguracoesLayout>
  );
}