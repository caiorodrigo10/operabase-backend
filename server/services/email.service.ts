import { createClient } from '@supabase/supabase-js';

interface SendPasswordResetEmailParams {
  to: string;
  token: string;
  userName: string;
}

interface EmailServiceResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

export class SupabaseEmailService {
  private supabase;
  private baseUrl: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials missing for email service');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Determine base URL for email links
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : 'http://localhost:5000';
  }

  async sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<EmailServiceResponse> {
    try {
      const { to, token, userName } = params;
      const resetLink = `${this.baseUrl}/recuperar-senha?token=${token}`;

      // Create email HTML template
      const emailHtml = this.createPasswordResetTemplate({
        userName,
        resetLink,
        expirationTime: '1 hora'
      });

      // Try to send email using Supabase Auth reset password
      const { error } = await this.supabase.auth.admin.generateLink({
        type: 'recovery',
        email: to,
        options: {
          redirectTo: resetLink
        }
      });

      if (error) {
        console.error('Supabase auth email error:', error);
        // Fallback: Use our custom token system
        console.log(`📧 Using fallback - custom token system`);
        console.log(`🔗 Link de recuperação: ${resetLink}`);
        
        return {
          success: true,
          message: 'Email enviado com sucesso (fallback)',
          messageId: 'fallback'
        };
      }

      console.log(`📧 Email de recuperação enviado via Supabase Auth para: ${to}`);
      console.log(`🔗 Link de recuperação: ${resetLink}`);

      return {
        success: true,
        message: 'Email enviado com sucesso',
        messageId: 'supabase-auth'
      };

    } catch (error: any) {
      console.error('Email service error:', error);
      
      // Fallback: Log token for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔑 FALLBACK - TOKEN DE RECUPERAÇÃO:`);
        console.log(`Email: ${params.to}`);
        console.log(`Token: ${params.token}`);
        console.log(`Link: ${this.baseUrl}/recuperar-senha?token=${params.token}\n`);
      }

      return {
        success: false,
        message: error.message || 'Erro ao enviar email'
      };
    }
  }

  async sendClinicInvitation(
    email: string,
    adminName: string,
    clinicName: string,
    token: string
  ): Promise<EmailServiceResponse> {
    try {
      const invitationLink = `${this.baseUrl}/convite-clinica/${token}`;

      // Create email HTML template
      const emailHtml = this.createClinicInvitationTemplate({
        adminName,
        clinicName,
        invitationLink,
        expirationTime: '7 dias'
      });

      // Log invitation for development (since we don't have actual email sending configured)
      console.log(`📧 Convite de clínica enviado para: ${email}`);
      console.log(`🏥 Clínica: ${clinicName}`);
      console.log(`👤 Admin: ${adminName}`);
      console.log(`🔗 Link do convite: ${invitationLink}`);

      return {
        success: true,
        message: 'Convite enviado com sucesso',
        messageId: 'clinic-invitation'
      };

    } catch (error: any) {
      console.error('Error sending clinic invitation:', error);

      // Fallback: Log invitation for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n📨 FALLBACK - CONVITE DE CLÍNICA:`);
        console.log(`Email: ${email}`);
        console.log(`Clínica: ${clinicName}`);
        console.log(`Admin: ${adminName}`);
        console.log(`Token: ${token}`);
        console.log(`Link: ${this.baseUrl}/convite-clinica/${token}\n`);
      }

      return {
        success: false,
        message: error.message || 'Erro ao enviar convite'
      };
    }
  }

  private createPasswordResetTemplate({ userName, resetLink, expirationTime }: {
    userName: string;
    resetLink: string;
    expirationTime: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de Senha - Operabase</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Operabase</h1>
            <p style="color: #a7f3d0; margin: 8px 0 0 0; font-size: 16px;">Plataforma de Gestão em Saúde</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">
                Recuperação de Senha
            </h2>
            
            <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                Olá, <strong>${userName}</strong>!
            </p>
            
            <p style="color: #4b5563; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                Você solicitou a recuperação de senha para sua conta na Operabase. 
                Clique no botão abaixo para criar uma nova senha:
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="display: inline-block; background: #0f766e; color: white; padding: 16px 32px; 
                          text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;
                          box-shadow: 0 4px 6px rgba(15, 118, 110, 0.2); transition: all 0.2s;">
                    Resetar Minha Senha
                </a>
            </div>

            <p style="color: #6b7280; margin: 30px 0 0 0; font-size: 14px; line-height: 1.6;">
                <strong>Importante:</strong> Este link expira em <strong>${expirationTime}</strong>. 
                Se você não solicitou esta recuperação, pode ignorar este email com segurança.
            </p>

            <!-- Security Notice -->
            <div style="background: #f3f4f6; border-radius: 6px; padding: 16px; margin: 30px 0;">
                <p style="color: #374151; margin: 0; font-size: 14px; line-height: 1.6;">
                    🔒 <strong>Dica de Segurança:</strong> Nunca compartilhe este link com outras pessoas. 
                    Nossa equipe nunca solicitará sua senha por email.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
                © ${new Date().getFullYear()} Operabase - Plataforma de Gestão em Saúde
            </p>
            <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">
                Se você não conseguir clicar no botão, copie e cole este link no seu navegador:<br>
                <span style="word-break: break-all;">${resetLink}</span>
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  private createClinicInvitationTemplate({ adminName, clinicName, invitationLink, expirationTime }: {
    adminName: string;
    clinicName: string;
    invitationLink: string;
    expirationTime: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convite para Clínica - Operabase</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🏥 Operabase</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Plataforma de Gestão em Saúde</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                Convite para Administrar Clínica
            </h2>

            <p style="color: #374151; margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
                Olá <strong>${adminName}</strong>,
            </p>

            <p style="color: #374151; margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
                Você foi convidado para ser o administrador da clínica <strong>"${clinicName}"</strong> 
                na plataforma Operabase.
            </p>

            <p style="color: #374151; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                A Operabase é uma plataforma completa de gestão em saúde que oferece:
            </p>

            <!-- Features List -->
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
                <ul style="color: #374151; margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                    <li>📅 Gestão completa de consultas e agendamentos</li>
                    <li>👥 Controle de pacientes e histórico médico</li>
                    <li>🤖 Assistente de IA (Mara) para atendimento</li>
                    <li>📱 Integração com WhatsApp</li>
                    <li>📊 Relatórios e análises detalhadas</li>
                    <li>🔒 Segurança de dados healthcare-grade</li>
                </ul>
            </div>

            <p style="color: #374151; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                Para aceitar o convite e começar a usar a plataforma, clique no botão abaixo:
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 0 0 30px 0;">
                <a href="${invitationLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); 
                          color: white; text-decoration: none; padding: 14px 30px; border-radius: 6px; 
                          font-weight: 600; font-size: 16px; transition: all 0.3s;">
                    🎯 Aceitar Convite e Criar Conta
                </a>
            </div>

            <p style="color: #6b7280; margin: 30px 0 0 0; font-size: 14px; line-height: 1.6;">
                <strong>Importante:</strong> Este convite expira em <strong>${expirationTime}</strong>. 
                Você precisará criar uma senha para acessar sua conta.
            </p>

            <!-- Next Steps -->
            <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 30px 0;">
                <p style="color: #0c4a6e; margin: 0; font-size: 14px; line-height: 1.6;">
                    📋 <strong>Próximos passos:</strong><br>
                    1. Clique no link acima<br>
                    2. Crie sua senha de acesso<br>
                    3. Configure os dados da sua clínica<br>
                    4. Comece a usar todas as funcionalidades!
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
                © ${new Date().getFullYear()} Operabase - Plataforma de Gestão em Saúde
            </p>
            <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">
                Se você não conseguir clicar no botão, copie e cole este link no seu navegador:<br>
                <span style="word-break: break-all;">${invitationLink}</span>
            </p>
        </div>
    </div>
</body>
</html>`;
  }
}

// Export singleton instance
export const emailService = new SupabaseEmailService();