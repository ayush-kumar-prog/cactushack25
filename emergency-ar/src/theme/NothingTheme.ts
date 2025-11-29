export const NothingColors = {
    background: '#000000',
    surface: '#1A1A1A',
    textPrimary: '#FFFFFF',
    textSecondary: '#C6C6C6',
    accent: '#D71921', // Nothing Red
    border: '#FFFFFF',
    success: '#00FF00', // Or a dot matrix green
    warning: '#D71921',
};

export const NothingSpacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const NothingBorderRadius = {
    sm: 2,
    md: 4,
    lg: 12, // Nothing OS uses some rounded corners, but often sharp or large radii
    pill: 999,
};

export const NothingFonts = {
    // We'll use system monospace as a fallback for dot matrix if not loaded
    dotMatrix: 'monospace',
    primary: 'System',
};
