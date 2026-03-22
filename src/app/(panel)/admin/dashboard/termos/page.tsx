import { getActiveTermAction, getAllTermsAction, getTermAcceptancesAction, getActiveGuardianTemplateAction, getAllGuardianTemplatesAction, getGuardianDeclarationsAction, getManagementAuthorizationsAction } from './actions';
import { getPendingSignedTermsAction } from '@/app/register/actions';
import { TermsEditor } from './TermsEditor';
import { TermAcceptancesList } from './TermAcceptancesList';
import { GuardianTermEditor } from './GuardianTermEditor';
import { GuardianDeclarationsList } from './GuardianDeclarationsList';
import { SignedTermsList } from './SignedTermsList';
import { ManagementAuthorizationsList } from './ManagementAuthorizationsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileTextIcon } from '@phosphor-icons/react/dist/ssr';

export default async function TermosPage() {
    const [activeTerm, allTerms, acceptances, activeGuardianTemplate, allGuardianTemplates, activeSelfRegisterTemplate, allSelfRegisterTemplates, activeMinorEventTemplate, allMinorEventTemplates, activeManagementTemplate, allManagementTemplates, guardianDeclarations, pendingSignedTerms, managementAuthorizations] = await Promise.all([
        getActiveTermAction(),
        getAllTermsAction(),
        getTermAcceptancesAction(1, ''),
        getActiveGuardianTemplateAction('academy'),
        getAllGuardianTemplatesAction('academy'),
        getActiveGuardianTemplateAction('self_register'),
        getAllGuardianTemplatesAction('self_register'),
        getActiveGuardianTemplateAction('minor_event'),
        getAllGuardianTemplatesAction('minor_event'),
        getActiveGuardianTemplateAction('academy_management'),
        getAllGuardianTemplatesAction('academy_management'),
        getGuardianDeclarationsAction(1, ''),
        getPendingSignedTermsAction(),
        getManagementAuthorizationsAction(1, ''),
    ]);

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl">
                    <FileTextIcon size={24} weight="duotone" className="text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Termos de Responsabilidade</h1>
                    <p className="text-sm text-muted-foreground">
                        Gerencie os termos e veja os aceites e declarações registrados.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="termo">
                {/* ── Grupo: Modelos de Termos ── */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Modelos de Termos</p>
                    <TabsList className="w-full flex-wrap h-auto justify-start">
                        <TabsTrigger value="termo">Adulto</TabsTrigger>
                        <TabsTrigger value="responsavel">Resp. Legal — Academia</TabsTrigger>
                        <TabsTrigger value="resp-auto-cadastro">Resp. Auto-Cadastro</TabsTrigger>
                        <TabsTrigger value="menor-eventos">Menor em Evento</TabsTrigger>
                        <TabsTrigger value="gerenc-conta">Gerenc. de Conta</TabsTrigger>
                    </TabsList>
                </div>

                {/* ── Grupo: Registros ── */}
                <div className="space-y-2 mt-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Registros</p>
                    <TabsList className="w-full flex-wrap h-auto justify-start">
                        <TabsTrigger value="aceites">
                            Aceites de Termo
                            {acceptances.total > 0 && (
                                <span className="ml-2 bg-primary/10 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
                                    {acceptances.total}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="declaracoes">
                            Declarações
                            {guardianDeclarations.total > 0 && (
                                <span className="ml-2 bg-primary/10 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
                                    {guardianDeclarations.total}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="termos-assinados">
                            Termos Assinados
                            {pendingSignedTerms.total > 0 && (
                                <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                                    {pendingSignedTerms.total}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="docs-gerenc">
                            Docs. Gerenciamento
                            {managementAuthorizations.total > 0 && (
                                <span className="ml-2 bg-primary/10 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
                                    {managementAuthorizations.total}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="termo" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <TermsEditor activeTerm={activeTerm} allTerms={allTerms} />
                    </div>
                </TabsContent>

                <TabsContent value="aceites" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <TermAcceptancesList
                            initialData={acceptances.data}
                            initialTotal={acceptances.total}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="responsavel" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <GuardianTermEditor
                            activeTemplate={activeGuardianTemplate}
                            allTemplates={allGuardianTemplates}
                            type="academy"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="resp-auto-cadastro" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                            <p className="text-xs font-semibold text-blue-800">Termo para auto-cadastro de menores</p>
                            <p className="text-xs text-blue-700 mt-0.5">
                                Este modelo é exibido ao responsável durante o cadastro do atleta pelo site (/register).
                                Não inclua o placeholder <code className="font-mono bg-blue-100 px-1 rounded">{'{{academia_nome}}'}</code> — ele não se aplica a este fluxo.
                            </p>
                        </div>
                        <GuardianTermEditor
                            activeTemplate={activeSelfRegisterTemplate}
                            allTemplates={allSelfRegisterTemplates}
                            type="self_register"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="menor-eventos" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
                            <p className="text-xs font-semibold text-violet-800">Termo para atleta menor — inscrição em evento</p>
                            <p className="text-xs text-violet-700 mt-0.5">
                                Este termo é exibido ao atleta menor de idade antes do pagamento de uma inscrição em campeonato,
                                no lugar do termo padrão. Faz referência ao Termo de Cadastro já aceito anteriormente.
                                Placeholders disponíveis incluem dados do responsável e do evento.
                            </p>
                        </div>
                        <GuardianTermEditor
                            activeTemplate={activeMinorEventTemplate}
                            allTemplates={allMinorEventTemplates}
                            type="minor_event"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="declaracoes" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <GuardianDeclarationsList
                            initialData={guardianDeclarations.data}
                            initialTotal={guardianDeclarations.total}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="termos-assinados" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <SignedTermsList
                            initialData={pendingSignedTerms.data}
                            initialTotal={pendingSignedTerms.total}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="gerenc-conta" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold text-slate-800">Modelo — Autorização de Gerenciamento de Conta</p>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Este modelo é baixado pela academia no perfil de cada atleta. O atleta ou responsável assina fisicamente e a academia envia o documento assinado.
                                Placeholders: <code className="font-mono bg-slate-100 px-1 rounded">{'{{atleta_nome}}'}</code> <code className="font-mono bg-slate-100 px-1 rounded">{'{{academia_nome}}'}</code> <code className="font-mono bg-slate-100 px-1 rounded">{'{{data}}'}</code>
                            </p>
                        </div>
                        <GuardianTermEditor
                            activeTemplate={activeManagementTemplate}
                            allTemplates={allManagementTemplates}
                            type="academy_management"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="docs-gerenc" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold text-slate-800">Documentos de Autorização de Gerenciamento</p>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Documentos assinados enviados pelas academias autorizando o gerenciamento de conta dos atletas.
                                Este documento é opcional — o sistema funciona normalmente sem ele.
                            </p>
                        </div>
                        <ManagementAuthorizationsList
                            initialData={managementAuthorizations.data}
                            initialTotal={managementAuthorizations.total}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
