import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Save } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useToast } from '@/hooks/use-toast';
import { ConfiguracoesLayout } from './index';

// Country selector component
const CountrySelector = ({ value, onChange, placeholder = "Selecione um país" }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const countries = [
    { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
    { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    // Add more countries as needed
  ];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {countries.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{country.flag}</span>
              <span>{country.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default function ClinicaPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State para configurações da clínica
  const [phoneValue, setPhoneValue] = useState('');
  const [celularValue, setCelularValue] = useState('');
  const [workingDays, setWorkingDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [hasLunchBreak, setHasLunchBreak] = useState(true);
  const [clinicConfig, setClinicConfig] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  // Buscar dados da clínica
  const { data: clinic, refetch: refetchClinic } = useQuery({
    queryKey: ['/api/clinic/1/config'],
    staleTime: 0,
  });

  // Efeito para carregar dados da clínica
  useEffect(() => {
    if (clinic) {
      console.log('🏥 Clinic data loaded:', clinic);
      setPhoneValue(clinic.phone || '');
      setCelularValue(clinic.celular || '');
      setHasLunchBreak(clinic.has_lunch_break || false);
      
      if (clinic.working_days && Array.isArray(clinic.working_days)) {
        console.log('📅 Setting working days from clinic data:', clinic.working_days);
        setWorkingDays(clinic.working_days);
      }
      
      setClinicConfig(clinic);
    }
  }, [clinic]);

  // Função para salvar configurações
  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/clinic/1/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...clinicConfig,
          phone: phoneValue,
          celular: celularValue,
          working_days: workingDays,
          has_lunch_break: hasLunchBreak,
        }),
      });

      if (response.ok) {
        toast({
          title: "Configurações salvas",
          description: "As configurações da clínica foram atualizadas com sucesso.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/clinic/1/config'] });
      } else {
        throw new Error('Erro ao salvar configurações');
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ConfiguracoesLayout>
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clinic-name">Nome da Clínica</Label>
              <Input
                id="clinic-name"
                defaultValue={clinic?.name || ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="clinic-responsible">Responsável</Label>
              <Input
                id="clinic-responsible"
                defaultValue={clinic?.responsible || ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="clinic-phone">Telefone Principal</Label>
              <PhoneInput
                international
                defaultCountry="BR"
                value={phoneValue}
                onChange={(value) => setPhoneValue(value || "")}
                displayInitialValueAsLocalNumber={false}
                countryCallingCodeEditable={false}
                addInternationalOption={false}
                smartCaret={false}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 phone-input-container"
                style={{
                  '--PhoneInputCountryFlag-aspectRatio': '1.5',
                  '--PhoneInputCountrySelectArrow-color': 'transparent',
                } as any}
              />
            </div>
            <div>
              <Label htmlFor="clinic-celular">Celular/WhatsApp</Label>
              <PhoneInput
                international
                defaultCountry="BR"
                value={celularValue}
                onChange={(value) => setCelularValue(value || "")}
                displayInitialValueAsLocalNumber={false}
                countryCallingCodeEditable={false}
                addInternationalOption={false}
                smartCaret={false}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 phone-input-container"
                style={{
                  '--PhoneInputCountryFlag-aspectRatio': '1.5',
                  '--PhoneInputCountrySelectArrow-color': 'transparent',
                } as any}
              />
            </div>
            <div>
              <Label htmlFor="clinic-email">E-mail</Label>
              <Input
                id="clinic-email"
                type="email"
                defaultValue={clinic?.email || ""}
                className="mt-1"
                placeholder="contato@clinica.com.br"
              />
            </div>
            <div>
              <Label htmlFor="clinic-website">Website</Label>
              <Input
                id="clinic-website"
                defaultValue={clinic?.website || ""}
                className="mt-1"
                placeholder="www.clinica.com.br"
              />
            </div>
            <div>
              <Label htmlFor="clinic-cnpj">CNPJ</Label>
              <Input
                id="clinic-cnpj"
                defaultValue={clinic?.cnpj || ""}
                className="mt-1"
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div>
              <Label htmlFor="total-professionals">Número de Profissionais</Label>
              <Select defaultValue="1">
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 profissional</SelectItem>
                  <SelectItem value="2-5">2-5 profissionais</SelectItem>
                  <SelectItem value="6-10">6-10 profissionais</SelectItem>
                  <SelectItem value="11-20">11-20 profissionais</SelectItem>
                  <SelectItem value="21+">Mais de 20 profissionais</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="clinic-description">Descrição da Clínica</Label>
            <textarea
              id="clinic-description"
              defaultValue={clinic?.description || ""}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              rows={3}
              placeholder="Descreva os serviços e especialidades da clínica..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço Completo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="address-street">Logradouro</Label>
              <Input
                id="address-street"
                defaultValue={clinic?.address_street || ""}
                className="mt-1"
                placeholder="Rua, Avenida, Praça..."
              />
            </div>
            <div>
              <Label htmlFor="address-number">Número</Label>
              <Input
                id="address-number"
                defaultValue={clinic?.address_number || ""}
                className="mt-1"
                placeholder="123"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address-complement">Complemento</Label>
              <Input
                id="address-complement"
                defaultValue={clinic?.address_complement || ""}
                className="mt-1"
                placeholder="Sala, Andar, Bloco... (opcional)"
              />
            </div>
            <div>
              <Label htmlFor="address-neighborhood">Bairro</Label>
              <Input
                id="address-neighborhood"
                defaultValue={clinic?.address_neighborhood || ""}
                className="mt-1"
                placeholder="Nome do bairro"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="address-city">Cidade</Label>
              <Input
                id="address-city"
                defaultValue={clinic?.address_city || ""}
                className="mt-1"
                placeholder="Nome da cidade"
              />
            </div>
            <div>
              <Label htmlFor="address-state">Estado/UF</Label>
              <Select defaultValue={clinic?.address_state || "SP"}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AC">Acre</SelectItem>
                  <SelectItem value="AL">Alagoas</SelectItem>
                  <SelectItem value="AP">Amapá</SelectItem>
                  <SelectItem value="AM">Amazonas</SelectItem>
                  <SelectItem value="BA">Bahia</SelectItem>
                  <SelectItem value="CE">Ceará</SelectItem>
                  <SelectItem value="DF">Distrito Federal</SelectItem>
                  <SelectItem value="ES">Espírito Santo</SelectItem>
                  <SelectItem value="GO">Goiás</SelectItem>
                  <SelectItem value="MA">Maranhão</SelectItem>
                  <SelectItem value="MT">Mato Grosso</SelectItem>
                  <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                  <SelectItem value="MG">Minas Gerais</SelectItem>
                  <SelectItem value="PA">Pará</SelectItem>
                  <SelectItem value="PB">Paraíba</SelectItem>
                  <SelectItem value="PR">Paraná</SelectItem>
                  <SelectItem value="PE">Pernambuco</SelectItem>
                  <SelectItem value="PI">Piauí</SelectItem>
                  <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                  <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                  <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                  <SelectItem value="RO">Rondônia</SelectItem>
                  <SelectItem value="RR">Roraima</SelectItem>
                  <SelectItem value="SC">Santa Catarina</SelectItem>
                  <SelectItem value="SP">São Paulo</SelectItem>
                  <SelectItem value="SE">Sergipe</SelectItem>
                  <SelectItem value="TO">Tocantins</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="address-zip">CEP</Label>
              <Input
                id="address-zip"
                defaultValue={clinic?.address_zip || ""}
                className="mt-1"
                placeholder="00000-000"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="address-country">País</Label>
            <div className="mt-1">
              <CountrySelector
                value={clinicConfig.address_country || "BR"}
                onChange={(value) => setClinicConfig(prev => ({ ...prev, address_country: value }))}
                placeholder="Selecione o país"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horários de Funcionamento</CardTitle>
          <p className="text-sm text-slate-600">Configure os dias e horários de atendimento da clínica</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-700">Dias de Funcionamento</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'monday', label: 'Segunda', defaultChecked: true },
                { id: 'tuesday', label: 'Terça', defaultChecked: true },
                { id: 'wednesday', label: 'Quarta', defaultChecked: true },
                { id: 'thursday', label: 'Quinta', defaultChecked: true },
                { id: 'friday', label: 'Sexta', defaultChecked: true },
                { id: 'saturday', label: 'Sábado', defaultChecked: false },
                { id: 'sunday', label: 'Domingo', defaultChecked: false }
              ].map((day) => (
                <div key={day.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={day.id} 
                    checked={workingDays.includes(day.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setWorkingDays([...workingDays, day.id]);
                      } else {
                        setWorkingDays(workingDays.filter(d => d !== day.id));
                      }
                    }}
                  />
                  <Label htmlFor={day.id} className="text-sm">{day.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-700">Horário de Atendimento</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="work-start">Início</Label>
                  <Input
                    id="work-start"
                    type="time"
                    defaultValue="08:00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="work-end">Fim</Label>
                  <Input
                    id="work-end"
                    type="time"
                    defaultValue="18:00"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="lunch-break" 
                  checked={hasLunchBreak}
                  onCheckedChange={(checked) => setHasLunchBreak(checked === true)}
                />
                <Label htmlFor="lunch-break" className="text-sm font-medium text-slate-700">
                  Intervalo para Almoço
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lunch-start" className={!hasLunchBreak ? "text-slate-400" : ""}>
                    Início do Almoço
                  </Label>
                  <Input
                    id="lunch-start"
                    type="time"
                    defaultValue="12:00"
                    className="mt-1"
                    disabled={!hasLunchBreak}
                  />
                </div>
                <div>
                  <Label htmlFor="lunch-end" className={!hasLunchBreak ? "text-slate-400" : ""}>
                    Fim do Almoço
                  </Label>
                  <Input
                    id="lunch-end"
                    type="time"
                    defaultValue="13:00"
                    className="mt-1"
                    disabled={!hasLunchBreak}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="timezone">Fuso Horário</Label>
            <Select defaultValue="america-sao-paulo">
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o fuso horário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="america-sao-paulo">America/São_Paulo (UTC-3)</SelectItem>
                <SelectItem value="america-manaus">America/Manaus (UTC-4)</SelectItem>
                <SelectItem value="america-rio-branco">America/Rio_Branco (UTC-5)</SelectItem>
                <SelectItem value="america-noronha">America/Noronha (UTC-2)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={() => refetchClinic()}>
          Cancelar
        </Button>
        <Button 
          className="bg-teal-600 hover:bg-teal-700"
          onClick={handleSaveConfiguration}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
      </div>
    </ConfiguracoesLayout>
  );
}