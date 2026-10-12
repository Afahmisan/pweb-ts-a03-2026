export const PRIORITY_CONFIGS = {
    vip: {
        key: 'vip',
        label: 'VIP',
        weight: 1, // Tier 1 (Utama)
        badgeClass: 'badge--vip',
        description: 'Jalur Eksekutif & Darurat Khusus'
    },
    disabilitas: {
        key: 'disabilitas',
        label: 'Disabilitas',
        weight: 2, // Tier 2
        badgeClass: 'badge--disability',
        description: 'Prioritas Difabel & Kebutuhan Khusus'
    },
    lansia: {
        key: 'lansia',
        label: 'Lansia',
        weight: 3, // Tier 3
        badgeClass: 'badge--elderly',
        description: 'Prioritas Lanjut Usia (≥ 60 Tahun)'
    },
    normal: {
        key: 'normal',
        label: 'Normal',
        weight: 4, // Tier 4
        badgeClass: 'badge--normal',
        description: 'Pasien Rawat Jalan Standar'
    }
};
export function normalizePriority(p) {
    if (!p)
        return 'normal';
    const s = String(p).toLowerCase().trim();
    if (s.includes('vip') || s.includes('exec') || s.includes('fast'))
        return 'vip';
    if (s.includes('disab') || s.includes('difabel') || s.includes('khusus'))
        return 'disabilitas';
    if (s.includes('lan') || s.includes('geriatri') || s.includes('elderly') || s.includes('ibu'))
        return 'lansia';
    return 'normal';
}
export function getPriorityOrder(p) {
    const norm = normalizePriority(p);
    switch (norm) {
        case 'vip':
            return 1;
        case 'disabilitas':
            return 2;
        case 'lansia':
            return 3;
        case 'normal':
        default:
            return 4;
    }
}
