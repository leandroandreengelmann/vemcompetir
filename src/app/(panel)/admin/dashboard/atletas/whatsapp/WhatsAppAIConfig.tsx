'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SpinnerGapIcon, RobotIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getAIConfig, saveAIConfig } from './actions';

const DEFAULT_SYSTEM_PROMPT = `Você é a assistente virtual do Vem Competir, plataforma brasileira de inscrições em competições esportivas de artes marciais (jiu-jitsu, judô, karatê, wrestling, entre outros).

Seu nome é **Vivi** e você é simpática, objetiva e sempre disposta a ajudar. Responda sempre em português brasileiro de forma clara e amigável.

═══════════════════════════════════════
🏆 SOBRE O VEM COMPETIR
═══════════════════════════════════════
O Vem Competir é uma plataforma que conecta atletas a eventos esportivos. Academias e organizadores cadastram eventos, e atletas se inscrevem com poucos cliques. Tudo online, sem papelada.

Site: vemcompetir.com.br

═══════════════════════════════════════
📋 COMO SE INSCREVER EM UM EVENTO
═══════════════════════════════════════
1. Acesse vemcompetir.com.br
2. Encontre o evento desejado na página inicial
3. Clique em "Inscrever-se"
4. Crie uma conta ou faça login
5. Preencha seus dados: nome, CPF, data de nascimento, faixa, peso, sexo
6. Escolha a categoria correta
7. Adicione ao carrinho e finalize o pagamento
8. Pronto! Você receberá confirmação por e-mail

═══════════════════════════════════════
💳 PAGAMENTO
═══════════════════════════════════════
Formas aceitas:
- PIX (aprovação imediata)
- Cartão de crédito (até 12x dependendo do evento)
- Boleto bancário (prazo de compensação de 1-3 dias úteis)

O pagamento é processado com segurança pela Asaas (plataforma financeira regulamentada pelo Banco Central).

Após o pagamento, o status muda para "Pago" ou "Confirmado" automaticamente.

Se o pagamento não aparecer como confirmado após 30 minutos (PIX) ou 3 dias úteis (boleto), entre em contato conosco.

═══════════════════════════════════════
🥋 CATEGORIAS
═══════════════════════════════════════
As categorias variam por evento, mas geralmente incluem:
- Faixa: branca, azul, roxa, marrom, preta (e graduações)
- Peso: galo, pluma, pena, leve, médio, meio-pesado, pesado, super-pesado, pesadíssimo
- Sexo: masculino, feminino
- Idade: infantil, juvenil, adulto, master (30+, 35+, 40+, etc.)

Se não souber qual categoria escolher, verifique o regulamento do evento ou entre em contato com o organizador.

═══════════════════════════════════════
👶 ATLETAS MENORES DE IDADE
═══════════════════════════════════════
Para atletas menores de 18 anos:
- Um responsável legal precisa assinar o termo de autorização
- O responsável recebe um link por e-mail para assinar digitalmente
- Sem a assinatura, a inscrição não é confirmada
- O responsável deve ter um e-mail válido cadastrado

═══════════════════════════════════════
🏫 ACADEMIAS E EQUIPES
═══════════════════════════════════════
Professores e responsáveis por academias podem:
- Criar uma conta do tipo "Academia/Equipe"
- Cadastrar seus atletas em lote
- Inscrever vários atletas de uma vez
- Acompanhar todas as inscrições em um painel centralizado

Para criar conta de academia, acesse "Cadastrar" e selecione "Academia/Equipe".

═══════════════════════════════════════
🔑 PROBLEMAS COM CONTA
═══════════════════════════════════════
- Esqueci minha senha: Clique em "Esqueci minha senha" na tela de login e siga as instruções
- E-mail não confirmado: Verifique a caixa de spam; reenvie o e-mail de confirmação na tela de login
- Não consigo acessar: Verifique se está usando o e-mail correto; tente redefinir a senha

═══════════════════════════════════════
❌ CANCELAMENTO E REEMBOLSO
═══════════════════════════════════════
A política de cancelamento é definida por cada organizador do evento. Em geral:
- Cancelamentos antes do prazo definido: reembolso total ou parcial conforme regulamento
- Cancelamentos após o prazo: sem reembolso
- Para solicitar cancelamento: acesse sua inscrição no painel e clique em "Cancelar" ou entre em contato

═══════════════════════════════════════
📱 APLICATIVO
═══════════════════════════════════════
No momento o Vem Competir funciona pelo navegador web (mobile e desktop). Acesse pelo celular em vemcompetir.com.br para a melhor experiência.

═══════════════════════════════════════
🤖 REGRAS DO ATENDIMENTO
═══════════════════════════════════════
- Responda de forma curta e objetiva (máximo 3 parágrafos)
- Use emojis com moderação para deixar a conversa mais amigável
- Se não souber a resposta, diga que vai verificar com a equipe
- NUNCA invente informações sobre valores, datas ou regras de eventos específicos
- Se perguntarem sobre um evento específico e você não tiver os dados, diga: "Para informações específicas sobre este evento, recomendo verificar diretamente na página do evento em vemcompetir.com.br ou entrar em contato com o organizador."
- Se o usuário quiser falar com um humano, informe que pode digitar "falar com atendente" a qualquer momento`;

export function WhatsAppAIConfig() {
    const [apiKey, setApiKey] = useState('');
    const [adminPhone, setAdminPhone] = useState('556696407075');
    const [model, setModel] = useState('gpt-4o-mini');
    const [enabled, setEnabled] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
    const [loading, setLoading] = useState(false);
    const [hasKey, setHasKey] = useState(false);

    useEffect(() => { loadConfig(); }, []);

    async function loadConfig() {
        const data = await getAIConfig();
        if (data) {
            setApiKey(data.openai_api_key ? '••••••••••••••••••••••••' : '');
            setHasKey(!!data.openai_api_key);
            setAdminPhone(data.admin_phone ?? '556696407075');
            setModel(data.model ?? 'gpt-4o-mini');
            setEnabled(data.enabled ?? false);
            setSystemPrompt(data.system_prompt || DEFAULT_SYSTEM_PROMPT);
        }
    }

    async function handleSave() {
        if (!apiKey.trim() || apiKey === '••••••••••••••••••••••••') {
            if (!hasKey) { toast.error('Insira a chave da OpenAI.'); return; }
        }
        setLoading(true);
        try {
            const keyToSave = apiKey === '••••••••••••••••••••••••' ? '' : apiKey.trim();
            await saveAIConfig(keyToSave || '__keep__', adminPhone.trim(), model, enabled, systemPrompt);
            toast.success('Configurações da IA salvas!');
            await loadConfig();
        } catch {
            toast.error('Erro ao salvar.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <Card className="shadow-none">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                        <RobotIcon size={28} weight="duotone" className="text-muted-foreground" />
                        Assistente IA
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                    {/* Toggle ativo */}
                    <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                        <div>
                            <p className="text-panel-sm font-semibold">IA ativa</p>
                            <p className="text-panel-sm text-muted-foreground">Quando ativa, responde automaticamente todas as mensagens recebidas</p>
                        </div>
                        <button
                            onClick={() => setEnabled(v => !v)}
                            className={cn(
                                'relative w-12 h-6 rounded-full transition-colors shrink-0',
                                enabled ? 'bg-green-500' : 'bg-muted-foreground/30'
                            )}
                        >
                            <span className={cn(
                                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                                enabled ? 'translate-x-6' : 'translate-x-0'
                            )} />
                        </button>
                    </div>

                    {/* Chave OpenAI */}
                    <div className="space-y-2">
                        <Label className="text-panel-sm font-medium text-muted-foreground">Chave da OpenAI (API Key)</Label>
                        <Input
                            variant="lg"
                            type="password"
                            placeholder="sk-proj-..."
                            value={apiKey}
                            onFocus={() => { if (apiKey === '••••••••••••••••••••••••') setApiKey(''); }}
                            onChange={e => setApiKey(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground">Sua chave fica armazenada com segurança no banco de dados, nunca no código.</p>
                    </div>

                    {/* Modelo */}
                    <div className="space-y-2">
                        <Label className="text-panel-sm font-medium text-muted-foreground">Modelo</Label>
                        <select
                            value={model}
                            onChange={e => setModel(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border bg-background text-panel-sm"
                        >
                            <option value="gpt-4o-mini">GPT-4o Mini (mais rápido e econômico)</option>
                            <option value="gpt-4o">GPT-4o (mais inteligente)</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        </select>
                    </div>

                    {/* Telefone admin */}
                    <div className="space-y-2">
                        <Label className="text-panel-sm font-medium text-muted-foreground">Telefone do Admin (com 55 + DDD)</Label>
                        <Input
                            variant="lg"
                            placeholder="556696407075"
                            value={adminPhone}
                            onChange={e => setAdminPhone(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground">Quando alguém pedir atendimento humano, você será notificado neste número.</p>
                    </div>

                    {/* Aviso escalação */}
                    <div className="flex items-start gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                        <WarningCircleIcon size={18} weight="duotone" className="text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-panel-sm text-blue-800 dark:text-blue-300">
                            Palavras que acionam atendimento humano: <strong>"falar com atendente"</strong>, <strong>"quero humano"</strong>, <strong>"preciso de atendente"</strong>, entre outras variações.
                        </p>
                    </div>

                    <Button onClick={handleSave} disabled={loading} pill className="w-full h-12 font-semibold">
                        {loading && <SpinnerGapIcon size={16} weight="bold" className="animate-spin mr-2" />}
                        Salvar Configurações da IA
                    </Button>
                </CardContent>
            </Card>

            {/* System Prompt */}
            <Card className="shadow-none">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                        <RobotIcon size={28} weight="duotone" className="text-muted-foreground" />
                        System Prompt (conhecimento da IA)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-3">
                    <p className="text-panel-sm text-muted-foreground">Este é o conteúdo que a IA usa para responder. Edite conforme necessário.</p>
                    <textarea
                        value={systemPrompt}
                        onChange={e => setSystemPrompt(e.target.value)}
                        rows={20}
                        className="w-full rounded-xl border bg-muted/20 p-4 text-panel-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button onClick={handleSave} disabled={loading} variant="outline" pill className="w-full h-12 font-semibold">
                        {loading && <SpinnerGapIcon size={16} weight="bold" className="animate-spin mr-2" />}
                        Salvar System Prompt
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
