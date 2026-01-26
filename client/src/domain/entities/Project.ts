export interface Project {
    id: string;
    title: string;
    description?: string;
    status: 'active' | 'archived' | 'completed';
    createdAt: Date;
    updatedAt: Date;
    themeColor?: string; // Hex code for custom project theme
}
