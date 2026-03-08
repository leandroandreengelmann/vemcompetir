/**
 * Utility to map Supabase and authentication error messages to personalized Portuguese messages.
 */

export const getAuthErrorMessage = (error: any): string => {
    if (!error) return 'Ocorreu um erro inesperado.';

    const message = typeof error === 'string' ? error : error.message || '';
    const code = (error as any).code || '';

    // Auth Error Codes from Supabase/GoTrue
    switch (code) {
        case 'invalid_credentials':
            return 'E-mail ou senha incorretos. Por favor, verifique seus dados e tente novamente.';
        case 'email_not_confirmed':
            return 'Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada para ativar sua conta.';
        case 'user_not_found':
            return 'Nenhum usuário encontrado com este e-mail.';
        case 'invalid_grant':
            return 'Credenciais inválidas ou expiradas.';
        case 'signup_disabled':
            return 'O cadastro de novos usuários está temporariamente desativado.';
        case 'user_already_exists':
            return 'Este e-mail já está sendo utilizado por outra conta.';
        case 'weak_password':
            return 'A senha fornecida é muito fraca. Tente uma senha com pelo menos 6 caracteres, incluindo letras e números.';
        case 'over_email_send_rate_limit':
            return 'Muitas solicitações enviadas. Por favor, aguarde alguns minutos antes de tentar novamente.';
        case 'invalid_otp':
            return 'Código inválido ou já utilizado. Por favor, verifique o código e tente novamente.';
        case 'otp_expired':
            return 'O código expirou. Por favor, solicite um novo código.';
    }

    // Common error string matches
    if (message.includes('Invalid login credentials')) {
        return 'E-mail ou senha incorretos. Por favor, verifique seus dados e tente novamente.';
    }

    if (message.includes('User already registered')) {
        return 'Este e-mail já está cadastrado. Tente fazer login ou recuperar sua senha.';
    }

    if (message.includes('Email not confirmed')) {
        return 'Por favor, confirme seu e-mail antes de acessar a plataforma.';
    }

    if (message.includes('Password should be at least')) {
        return 'Sua senha deve ter pelo menos 6 caracteres.';
    }

    // Default fallback
    return message || 'Ocorreu um erro ao processar sua solicitação. Tente novamente em instantes.';
};
