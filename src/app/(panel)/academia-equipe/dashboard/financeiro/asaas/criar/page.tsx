'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type PersonType = 'PF' | 'PJ';

const COMPANY_TYPES = [
    { value: 'MEI', label: 'MEI' },
    { value: 'LIMITED', label: 'LTDA' },
    { value: 'INDIVIDUAL', label: 'EIRELI' },
    { value: 'ASSOCIATION', label: 'Associação' },
];

function maskCPF(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCNPJ(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 14);
    return d
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskCEP(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 8);
    return d.replace(/(\d{5})(\d)/, '$1-$2');
}

function maskPhone(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 10) {
        return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function onlyDigits(v: string): string {
    return v.replace(/\D/g, '');
}

function maskCurrency(v: string): string {
    const digits = v.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10) / 100;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrency(v: string): number {
    const digits = v.replace(/\D/g, '');
    return parseInt(digits || '0', 10) / 100;
}

export default function CriarSubcontaPage() {
    const router = useRouter();
    const [personType, setPersonType] = useState<PersonType>('PF');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: '',
        email: '',
        cpfCnpj: '',
        phone: '',
        mobilePhone: '',
        birthDate: '',
        companyType: '',
        postalCode: '',
        address: '',
        addressNumber: '',
        complement: '',
        province: '',
        city: '',
        state: '',
        incomeValue: '',
    });

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const payload = {
                personType,
                name: form.name.trim(),
                email: form.email.trim(),
                cpfCnpj: onlyDigits(form.cpfCnpj),
                phone: onlyDigits(form.phone) || undefined,
                mobilePhone: onlyDigits(form.mobilePhone),
                postalCode: onlyDigits(form.postalCode),
                address: form.address.trim(),
                addressNumber: form.addressNumber.trim(),
                complement: form.complement.trim() || undefined,
                province: form.province.trim(),
                city: form.city.trim(),
                state: form.state.trim().toUpperCase(),
                birthDate: personType === 'PF' ? form.birthDate : undefined,
                companyType: personType === 'PJ' ? form.companyType : undefined,
                incomeValue: parseCurrency(form.incomeValue),
            };

            if (!payload.name) { setError('Nome é obrigatório.'); return; }
            if (!payload.email) { setError('E-mail é obrigatório.'); return; }
            if (!payload.cpfCnpj) { setError('CPF/CNPJ é obrigatório.'); return; }
            if (!payload.mobilePhone) { setError('Celular é obrigatório.'); return; }
            if (!payload.postalCode || payload.postalCode.length !== 8) { setError('CEP deve ter 8 dígitos.'); return; }
            if (!payload.address) { setError('Endereço é obrigatório.'); return; }
            if (!payload.addressNumber) { setError('Número é obrigatório.'); return; }
            if (!payload.province) { setError('Bairro é obrigatório.'); return; }
            if (!payload.city) { setError('Cidade é obrigatória.'); return; }
            if (!payload.state || payload.state.length !== 2) { setError('UF deve ter 2 letras.'); return; }
            if (!payload.incomeValue || payload.incomeValue <= 0) { setError('Renda/faturamento é obrigatório.'); return; }

            if (personType === 'PF') {
                if (payload.cpfCnpj.length !== 11) { setError('CPF deve ter 11 dígitos.'); return; }
                if (!payload.birthDate) { setError('Data de nascimento é obrigatória para PF.'); return; }
            } else {
                if (payload.cpfCnpj.length !== 14) { setError('CNPJ deve ter 14 dígitos.'); return; }
                if (!payload.companyType) { setError('Tipo de empresa é obrigatório para PJ.'); return; }
            }

            const res = await fetch('/api/asaas/subaccounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (!res.ok) {
                setError(result.error || 'Erro ao criar subconta.');
                return;
            }

            router.push('/academia-equipe/dashboard/financeiro/asaas');
            router.refresh();
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-panel-md font-bold font-bold">Criar subconta Asaas</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Informe os dados para criar sua conta no gateway de pagamentos.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <Alert variant="destructive" className="rounded-xl border shadow-sm">
                        <AlertDescription className="text-panel-sm font-medium">{error}</AlertDescription>
                    </Alert>
                )}

                {/* Person Type */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tipo de conta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant={personType === 'PF' ? 'default' : 'outline'}
                                onClick={() => {
                                    setPersonType('PF');
                                    updateField('cpfCnpj', '');
                                }}
                                pill
                                className={`flex-1 h-12 font-semibold ${personType === 'PF' ? 'text-primary-foreground' : 'text-foreground text-panel-sm'}`}
                            >
                                Pessoa Física
                            </Button>
                            <Button
                                type="button"
                                variant={personType === 'PJ' ? 'default' : 'outline'}
                                onClick={() => {
                                    setPersonType('PJ');
                                    updateField('cpfCnpj', '');
                                }}
                                pill
                                className={`flex-1 h-12 font-semibold ${personType === 'PJ' ? 'text-primary-foreground' : 'text-foreground text-panel-sm'}`}
                            >
                                Pessoa Jurídica
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Personal Data */}
                <Card>
                    <CardHeader>
                        <CardTitle>Dados {personType === 'PF' ? 'pessoais' : 'da empresa'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-panel-sm font-medium">{personType === 'PF' ? 'Nome completo' : 'Razão social'}</Label>
                            <Input variant="lg"
                                id="name"
                                value={form.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder={personType === 'PF' ? 'Ex: João da Silva' : 'Ex: Academia Silva LTDA'}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-panel-sm font-medium">E-mail</Label>
                            <Input variant="lg"
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => updateField('email', e.target.value)}
                                placeholder="exemplo@email.com"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cpfCnpj" className="text-panel-sm font-medium">{personType === 'PF' ? 'CPF' : 'CNPJ'}</Label>
                                <Input variant="lg"
                                    id="cpfCnpj"
                                    value={form.cpfCnpj}
                                    onChange={(e) =>
                                        updateField('cpfCnpj', personType === 'PF' ? maskCPF(e.target.value) : maskCNPJ(e.target.value))
                                    }
                                    placeholder={personType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}

                                    required
                                />
                            </div>

                            {personType === 'PF' && (
                                <div className="space-y-2">
                                    <Label htmlFor="birthDate" className="text-panel-sm font-medium">Data de nascimento</Label>
                                    <Input variant="lg"
                                        id="birthDate"
                                        type="date"
                                        value={form.birthDate}
                                        onChange={(e) => updateField('birthDate', e.target.value)}

                                        required
                                    />
                                </div>
                            )}

                            {personType === 'PJ' && (
                                <div className="space-y-2">
                                    <Label htmlFor="companyType" className="text-panel-sm font-medium">Tipo de empresa</Label>
                                    <select
                                        id="companyType"
                                        value={form.companyType}
                                        onChange={(e) => updateField('companyType', e.target.value)}
                                        className="flex h-12 w-full min-w-0 rounded-xl border border-input bg-transparent px-4 py-1 text-panel-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        {COMPANY_TYPES.map((ct) => (
                                            <option key={ct.value} value={ct.value}>
                                                {ct.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-panel-sm font-medium">Telefone fixo</Label>
                                <Input variant="lg"
                                    id="phone"
                                    value={form.phone}
                                    onChange={(e) => updateField('phone', maskPhone(e.target.value))}
                                    placeholder="(00) 0000-0000"

                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mobilePhone" className="text-panel-sm font-medium">Celular *</Label>
                                <Input variant="lg"
                                    id="mobilePhone"
                                    value={form.mobilePhone}
                                    onChange={(e) => updateField('mobilePhone', maskPhone(e.target.value))}
                                    placeholder="(00) 00000-0000"

                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="incomeValue" className="text-panel-sm font-medium">{personType === 'PF' ? 'Renda mensal' : 'Faturamento mensal'}</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-panel-sm text-muted-foreground font-medium">R$</span>
                                <Input variant="lg"
                                    id="incomeValue"
                                    value={form.incomeValue}
                                    onChange={(e) => updateField('incomeValue', maskCurrency(e.target.value))}
                                    placeholder="0,00"
                                    className="pl-12"

                                    required
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Address */}
                <Card>
                    <CardHeader>
                        <CardTitle>Endereço</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="postalCode" className="text-panel-sm font-medium">CEP</Label>
                                <Input variant="lg"
                                    id="postalCode"
                                    value={form.postalCode}
                                    onChange={(e) => updateField('postalCode', maskCEP(e.target.value))}
                                    placeholder="00000-000"

                                    required
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="address" className="text-panel-sm font-medium">Rua</Label>
                                <Input variant="lg"
                                    id="address"
                                    value={form.address}
                                    onChange={(e) => updateField('address', e.target.value)}
                                    placeholder="Nome da rua, avenida..."
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1 space-y-2">
                                <Label htmlFor="addressNumber" className="text-panel-sm font-medium">Nº</Label>
                                <Input variant="lg"
                                    id="addressNumber"
                                    value={form.addressNumber}
                                    onChange={(e) => updateField('addressNumber', e.target.value)}
                                    placeholder="123"
                                    required
                                />
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label htmlFor="complement" className="text-panel-sm font-medium">Complemento</Label>
                                <Input variant="lg"
                                    id="complement"
                                    value={form.complement}
                                    onChange={(e) => updateField('complement', e.target.value)}
                                    placeholder="Apto, Sala, Casa 2..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="province" className="text-panel-sm font-medium">Bairro</Label>
                                <Input variant="lg"
                                    id="province"
                                    value={form.province}
                                    onChange={(e) => updateField('province', e.target.value)}
                                    placeholder="Centro"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city" className="text-panel-sm font-medium">Cidade</Label>
                                <Input variant="lg"
                                    id="city"
                                    value={form.city}
                                    onChange={(e) => updateField('city', e.target.value)}

                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state" className="text-panel-sm font-medium">UF</Label>
                                <Input variant="lg"
                                    id="state"
                                    value={form.state}
                                    onChange={(e) => updateField('state', e.target.value.toUpperCase().slice(0, 2))}
                                    placeholder="SP"
                                    maxLength={2}

                                    required
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={isLoading}
                        pill
                        className="h-12 text-panel-sm font-semibold transition-all hover:bg-accent px-8"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        pill
                        className="h-12 px-8 text-panel-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] text-primary-foreground"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Criando...
                            </>
                        ) : (
                            'Criar subconta'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
