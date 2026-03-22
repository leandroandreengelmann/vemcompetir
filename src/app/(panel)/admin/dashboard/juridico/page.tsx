import { ScalesIcon } from '@phosphor-icons/react/dist/ssr';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    getActivePrivacyPolicyAction, getAllPrivacyPoliciesAction,
    getActiveTermsOfUseAction, getAllTermsOfUseAction,
    savePrivacyPolicyAction, activatePrivacyPolicyAction,
    saveTermsOfUseAction, activateTermsOfUseAction,
} from './actions';
import { LegalDocumentEditor } from './LegalDocumentEditor';

export default async function JuridicoPage() {
    const [activePrivacy, allPrivacy, activeTerms, allTerms] = await Promise.all([
        getActivePrivacyPolicyAction(),
        getAllPrivacyPoliciesAction(),
        getActiveTermsOfUseAction(),
        getAllTermsOfUseAction(),
    ]);

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl">
                    <ScalesIcon size={24} weight="duotone" className="text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Jurídico</h1>
                    <p className="text-sm text-muted-foreground">
                        Gerencie a Política de Privacidade e os Termos de Uso da plataforma.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="privacidade">
                <TabsList className="w-full flex-wrap h-auto justify-start">
                    <TabsTrigger value="privacidade">Política de Privacidade</TabsTrigger>
                    <TabsTrigger value="termos-de-uso">Termos de Uso</TabsTrigger>
                </TabsList>

                <TabsContent value="privacidade" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                            <p className="text-xs font-semibold text-blue-800">Disponível publicamente em /privacidade</p>
                            <p className="text-xs text-blue-700 mt-0.5">
                                A versão ativa é exibida para todos os visitantes da plataforma, sem necessidade de login.
                            </p>
                        </div>
                        <LegalDocumentEditor
                            activeDoc={activePrivacy}
                            allDocs={allPrivacy}
                            onSave={savePrivacyPolicyAction}
                            onActivate={activatePrivacyPolicyAction}
                            emptyLabel='Nenhuma política cadastrada. Clique em "Editar" para adicionar.'
                        />
                    </div>
                </TabsContent>

                <TabsContent value="termos-de-uso" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                            <p className="text-xs font-semibold text-blue-800">Disponível publicamente em /termos-de-uso</p>
                            <p className="text-xs text-blue-700 mt-0.5">
                                A versão ativa é exibida para todos os visitantes da plataforma, sem necessidade de login.
                            </p>
                        </div>
                        <LegalDocumentEditor
                            activeDoc={activeTerms}
                            allDocs={allTerms}
                            onSave={saveTermsOfUseAction}
                            onActivate={activateTermsOfUseAction}
                            emptyLabel='Nenhum termo de uso cadastrado. Clique em "Editar" para adicionar.'
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
