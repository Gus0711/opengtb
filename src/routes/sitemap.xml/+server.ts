import { SITE_URL } from '$lib/seo/meta';
import { builtTools } from '$lib/tools/registry';
import { getAllArticles } from '$lib/articles/loader';
import modbusManifestJson from '$lib/tools/modbus/manifest.generated.json';
import type { ModbusManifest } from '$lib/tools/modbus/types';

const modbusManifest = modbusManifestJson as ModbusManifest;

export const prerender = true;

interface UrlEntry {
	path: string;
	lastmod?: string;
	changefreq: 'weekly' | 'monthly';
	priority: string;
}

function buildEntries(): UrlEntry[] {
	const staticPages: UrlEntry[] = [
		{ path: '/', changefreq: 'weekly', priority: '1.0' },
		{ path: '/outils', changefreq: 'weekly', priority: '0.8' },
		{ path: '/articles', changefreq: 'weekly', priority: '0.7' }
	];
	const toolPages: UrlEntry[] = builtTools().map((t) => ({
		path: `/outils/${t.slug}`,
		changefreq: 'monthly',
		priority: '0.6'
	}));
	const articlePages: UrlEntry[] = getAllArticles().map((a) => ({
		path: `/articles/${a.slug}`,
		lastmod: a.date,
		changefreq: 'monthly',
		priority: '0.5'
	}));
	const modbusDevicePages: UrlEntry[] = modbusManifest.devices.map((d) => ({
		path: `/outils/modbus/${d.vendorSlug}/${d.modelSlug}`,
		changefreq: 'monthly',
		priority: '0.5'
	}));
	return [...staticPages, ...toolPages, ...articlePages, ...modbusDevicePages];
}

function renderEntry({ path, lastmod, changefreq, priority }: UrlEntry): string {
	const lastmodTag = lastmod ? `\n\t\t<lastmod>${lastmod}</lastmod>` : '';
	return `\t<url>
		<loc>${SITE_URL}${path}</loc>${lastmodTag}
		<changefreq>${changefreq}</changefreq>
		<priority>${priority}</priority>
	</url>`;
}

export const GET = () => {
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${buildEntries().map(renderEntry).join('\n')}
</urlset>
`;
	return new Response(body, {
		headers: { 'content-type': 'application/xml; charset=utf-8' }
	});
};
