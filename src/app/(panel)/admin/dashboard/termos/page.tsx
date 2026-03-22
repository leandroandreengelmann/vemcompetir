import { getActiveTermAction, getAllTermsAction, getTermAcceptancesAction, getActiveGuardianTemplateAction, getAllGuardianTemplatesAction, getGuardianDeclarationsAction } from './actions';
import { TermsEditor } from './TermsEditor';
import { TermAcceptancesList } from './TermAcceptancesList';
import { GuardianTermEditor } from './GuardianTermEditor';
import { GuardianDeclarationsList } from './GuardianDeclarationsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileTextIcon } from '@phosphor-icons/react/dist/ssr';

export default async function TermosPage() {
    const [activeTerm, allTerms, acceptances, activeGuardianTemplate, allGuardianTemplates, guardianDeclarations] = await Promise.all([
        getActiveTermAction(),
        getAllTermsAction(),
        getTermAcceptancesAction(1, ''),
        getActiveGuardianTemplateAction(),
        getAllGuardianTemplatesAction(),
        getGuardianDeclarationsAction(1, ''),
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
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="termo" className="flex-1 sm:flex-none">
                        Termo Ativo
                    </TabsTrigger>
                    <TabsTrigger value="aceites" className="flex-1 sm:flex-none">
                        Aceites
                        {acceptances.total > 0 && (
                            <span className="ml-2 bg-primary/10 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
                                {acceptances.total}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="responsavel" className="flex-1 sm:flex-none">
                        Resp. Legal
                    </TabsTrigger>
                    <TabsTrigger value="declaracoes" className="flex-1 sm:flex-none">
                        Declarações
                        {guardianDeclarations.total > 0 && (
                            <span className="ml-2 bg-primary/10 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
                                {guardianDeclarations.total}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

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
            </Tabs>
        </div>
    );
}
