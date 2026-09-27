export interface ArticleFrontmatter {
	title: string;
	date: string;
	author?: string;
	tags: string[];
	excerpt: string;
	cover?: string;
	reading_time?: number;
}

export interface Article extends Omit<ArticleFrontmatter, 'reading_time'> {
	slug: string;
	reading_time: number;
}
