/**
 * Persist an authenticated session the way the app expects to find it.
 *
 * Lifted out of Login's handleLoginSuccess so the invitation flow, which
 * signs the invitee in the moment they choose a password, writes the exact
 * same keys rather than a near-copy that drifts.
 */
export function storeSession(data) {
    const token = data?.data?.token;
    const userData = data?.data?.user ?? null;

    if (token) {
        localStorage.setItem('crm_auth_token', token);
        document.cookie = [
            `crm_auth_token=${token}`,
            'path=/',
            `max-age=${60 * 60 * 24 * 7}`,
            'SameSite=Lax',
        ].join('; ');
    }

    if (!userData) return;

    let roleValue = 'employee';
    if (userData.role) {
        if (typeof userData.role === 'string') {
            roleValue = userData.role.toLowerCase();
        } else if (typeof userData.role === 'object') {
            roleValue = (userData.role.slug || userData.role.name || 'employee').toLowerCase();
        }
    }

    localStorage.setItem('crm_user', JSON.stringify({
        ...userData,
        role: roleValue,
        roleDetails: (userData.role && typeof userData.role === 'object') ? userData.role : null,
        name: [userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.email,
    }));

    if (userData.company) {
        localStorage.setItem('crm_company', JSON.stringify(userData.company));
    }
}
