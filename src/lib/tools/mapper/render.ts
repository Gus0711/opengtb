import { MEDIA_LABELS, segmentSummary } from './bus';
import { POINT_COLORS, SUPERVISOR_DEFINITIONS, TARGET_DEFINITIONS, UPLINK_COLOR } from './data';
import type { Equipment, MapperDocument, Segment, Target } from './types';

/** Index segment → libelle « Bus compteurs · esclave 5 » affiche sous le nom de l'equipement. */
function busCaption(document: MapperDocument, equipment: Equipment): string | null {
	const segmentId = equipment.bus?.segmentId;
	if (!segmentId) return null;
	let found: Segment | undefined;
	for (const target of document.targets) {
		found = target.segments.find((segment) => segment.id === segmentId);
		if (found) break;
	}
	if (!found) return null;
	const address = equipment.bus?.address?.trim();
	return `${found.name} · ${MEDIA_LABELS[found.media]}${address ? ` · ${address}` : ''}`;
}

export function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function targetPoints(document: MapperDocument, target: Target) {
	return document.equipment.flatMap((equipment) =>
		equipment.points
			.filter((point) => point.targetId === target.id)
			.map((point) => ({ point, equipment }))
	);
}

export function renderMapperSvg(document: MapperDocument): string {
	const width = 1720;
	const supervisorX = 1380;
	const equipmentLayouts: Array<{ id: string; x: number; y: number; height: number }> = [];
	let equipmentY = 105;
	const busOffsets = new Map<string, number>();
	for (const equipment of document.equipment) {
		const offset = busCaption(document, equipment) ? 20 : 0;
		busOffsets.set(equipment.id, offset);
		const height = 58 + offset + Math.max(1, equipment.points.length) * 30;
		equipmentLayouts.push({ id: equipment.id, x: 36, y: equipmentY, height });
		equipmentY += height + 22;
	}

	const targetLayouts: Array<{ target: Target; x: number; y: number; height: number }> = [];
	let targetY = 105;
	for (const target of document.targets) {
		const count = targetPoints(document, target).length;
		const height = 62 + Math.max(1, count) * 30 + (target.segments.length ? 22 + target.segments.length * 22 : 0);
		targetLayouts.push({ target, x: 970, y: targetY, height });
		targetY += height + 28;
	}

	const supervisorLayouts: Array<{ id: string; x: number; y: number; height: number; centerY: number }> = [];
	let supervisorY = 105;
	for (const supervisor of document.supervisors) {
		const count = document.targets.filter((target) => target.supervisorId === supervisor.id).length;
		const boxHeight = 62 + Math.max(1, count) * 30;
		supervisorLayouts.push({ id: supervisor.id, x: supervisorX, y: supervisorY, height: boxHeight, centerY: supervisorY + boxHeight / 2 });
		supervisorY += boxHeight + 28;
	}

	const height = Math.max(560, equipmentY + 30, targetY + 30, supervisorY + 30);
	const targetPortY = new Map<string, number>();
	const uplinkPortY = new Map<string, number>();

	const supervisorsMarkup = supervisorLayouts
		.map((layout) => {
			const supervisor = document.supervisors.find((item) => item.id === layout.id)!;
			const rows = document.targets
				.filter((target) => target.supervisorId === supervisor.id)
				.map((target, index) => {
					const y = layout.y + 64 + index * 30;
					uplinkPortY.set(target.id, y - 7);
					return `<circle cx="${layout.x}" cy="${y - 7}" r="4" fill="${UPLINK_COLOR}"/><text x="${layout.x + 18}" y="${y - 2}" fill="#dbe3e8" font-family="Arial, sans-serif" font-size="12">${escapeXml(target.name)}</text><text x="${layout.x + 258}" y="${y - 2}" text-anchor="end" fill="${UPLINK_COLOR}" font-family="monospace" font-size="10" font-weight="700">${escapeXml(target.uplink)}</text>`;
				})
				.join('');
			return `<g id="${escapeXml(supervisor.id)}" data-supervisor-kind="${supervisor.kind}"><rect x="${layout.x}" y="${layout.y}" width="274" height="${layout.height}" rx="6" fill="#0e171b" stroke="${UPLINK_COLOR}66"/><rect x="${layout.x}" y="${layout.y}" width="274" height="42" rx="6" fill="#142129"/><text x="${layout.x + 16}" y="${layout.y + 19}" fill="${UPLINK_COLOR}" font-family="monospace" font-size="11">${escapeXml(SUPERVISOR_DEFINITIONS[supervisor.kind].label.toUpperCase())}</text><text x="${layout.x + 16}" y="${layout.y + 35}" fill="#f7fafc" font-family="Arial, sans-serif" font-size="15" font-weight="700">${escapeXml(supervisor.name)}</text>${rows}</g>`;
		})
		.join('');
	const targetsMarkup = targetLayouts
		.map((layout) => {
			const assigned = targetPoints(document, layout.target);
			const rows = assigned
				.map(({ point }, index) => {
					const y = layout.y + 64 + index * 30;
					targetPortY.set(point.id, y - 7);
					return `<circle cx="${layout.x}" cy="${y - 7}" r="4" fill="${POINT_COLORS[point.kind]}"/><text x="${layout.x + 18}" y="${y - 2}" fill="#dbe3e8" font-family="monospace" font-size="12">${escapeXml(point.address || point.kind)} · ${escapeXml(point.name)}</text>`;
				})
				.join('');
			const segmentsY = layout.y + 64 + Math.max(1, assigned.length) * 30;
			const segmentsMarkup = layout.target.segments.length
				? `<text x="${layout.x + 16}" y="${segmentsY + 4}" fill="#71808a" font-family="monospace" font-size="9">BUS</text>${layout.target.segments
						.map((segment, index) => {
							const y = segmentsY + 20 + index * 22;
							const devices = document.equipment.filter((item) => item.bus?.segmentId === segment.id).length;
							return `<text x="${layout.x + 16}" y="${y}" fill="#dbe3e8" font-family="Arial, sans-serif" font-size="11">${escapeXml(segment.name)}</text><text x="${layout.x + 258}" y="${y}" text-anchor="end" fill="#8fa0ab" font-family="monospace" font-size="9">${escapeXml(MEDIA_LABELS[segment.media])} · ${escapeXml(segmentSummary(segment))} · ${devices} dev</text>`;
						})
						.join('')}`
				: '';
			return `<g id="${escapeXml(layout.target.id)}" data-target-kind="${layout.target.kind}" data-segments="${layout.target.segments.length}"><rect x="${layout.x}" y="${layout.y}" width="274" height="${layout.height}" rx="6" fill="#11181d" stroke="#33414b"/><rect x="${layout.x}" y="${layout.y}" width="274" height="42" rx="6" fill="#172229"/><text x="${layout.x + 16}" y="${layout.y + 19}" fill="#67e480" font-family="monospace" font-size="11">${escapeXml(TARGET_DEFINITIONS[layout.target.kind].label.toUpperCase())}</text><text x="${layout.x + 16}" y="${layout.y + 35}" fill="#f7fafc" font-family="Arial, sans-serif" font-size="15" font-weight="700">${escapeXml(layout.target.name)}</text>${rows}${segmentsMarkup}</g>`;
		})
		.join('');

	const uplinkConnections = targetLayouts
		.map((layout) => {
			const portY = uplinkPortY.get(layout.target.id);
			const from = layout.x + 274;
			if (portY === undefined) {
				return `<path d="M${from} ${layout.y + 30} H${from + 120}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6 5" opacity="0.55"/><text x="${from + 132}" y="${layout.y + 34}" fill="#f59e0b" font-family="monospace" font-size="10">NON REMONTÉ</text>`;
			}
			const midY = layout.y + 30;
			return `<path d="M${from} ${midY} C${from + 110} ${midY} ${supervisorX - 110} ${portY} ${supervisorX} ${portY}" fill="none" stroke="${UPLINK_COLOR}" stroke-width="2.5" opacity="0.85"/><circle cx="${from}" cy="${midY}" r="4" fill="${UPLINK_COLOR}"/><text x="${(from + supervisorX) / 2}" y="${(midY + portY) / 2 - 6}" text-anchor="middle" fill="${UPLINK_COLOR}" font-family="monospace" font-size="10">${escapeXml(layout.target.uplink)}</text>`;
		})
		.join('');

	const connections: string[] = [];
	const equipmentMarkup = document.equipment
		.map((equipment) => {
			const layout = equipmentLayouts.find((item) => item.id === equipment.id)!;
			const offset = busOffsets.get(equipment.id) ?? 0;
			const rows = equipment.points
				.map((point, index) => {
					const y = layout.y + 64 + offset + index * 30;
					const targetYForPoint = targetPortY.get(point.id);
					if (targetYForPoint !== undefined) {
						connections.push(`<path d="M310 ${y - 7} C560 ${y - 7} 715 ${targetYForPoint} 970 ${targetYForPoint}" fill="none" stroke="${POINT_COLORS[point.kind]}" stroke-width="2" opacity="0.8"/><circle cx="310" cy="${y - 7}" r="4" fill="${POINT_COLORS[point.kind]}"/>`);
					} else {
						connections.push(`<path d="M310 ${y - 7} H520" fill="none" stroke="${POINT_COLORS[point.kind]}" stroke-width="2" stroke-dasharray="6 5" opacity="0.55"/><text x="535" y="${y - 2}" fill="#f59e0b" font-family="monospace" font-size="10">NON AFFECTÉ</text>`);
					}
					return `<rect x="52" y="${y - 21}" width="34" height="20" rx="3" fill="${POINT_COLORS[point.kind]}22" stroke="${POINT_COLORS[point.kind]}"/><text x="69" y="${y - 7}" text-anchor="middle" fill="${POINT_COLORS[point.kind]}" font-family="monospace" font-size="10" font-weight="700">${point.kind}</text><text x="98" y="${y - 6}" fill="#dbe3e8" font-family="Arial, sans-serif" font-size="12">${escapeXml(point.name)}</text>`;
				})
				.join('');
			return `<g id="${escapeXml(equipment.id)}" data-equipment-kind="${equipment.kind}"><rect x="36" y="${layout.y}" width="274" height="${layout.height}" rx="6" fill="#0f1519" stroke="#2a3740"/><rect x="36" y="${layout.y}" width="274" height="42" rx="6" fill="#151d22"/><text x="52" y="${layout.y + 18}" fill="#82919c" font-family="monospace" font-size="10">ÉQUIPEMENT</text><text x="52" y="${layout.y + 35}" fill="#f7fafc" font-family="Arial, sans-serif" font-size="15" font-weight="700">${escapeXml(equipment.name)}</text>${offset ? `<text x="52" y="${layout.y + 56}" fill="${POINT_COLORS[equipment.points[0]?.kind ?? 'MODBUS']}" font-family="monospace" font-size="9.5">${escapeXml(busCaption(document, equipment) ?? '')}</text>` : ''}${rows}</g>`;
		})
		.join('');

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="mapper-title mapper-desc"><title id="mapper-title">${escapeXml(document.title)}</title><desc id="mapper-desc">Architecture GTB et affectation des points</desc><defs><pattern id="mapper-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#1c252b" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="#090d10"/><rect width="100%" height="100%" fill="url(#mapper-grid)"/><text x="36" y="42" fill="#f9fafb" font-family="Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(document.title)}</text><text x="36" y="66" fill="#71808a" font-family="monospace" font-size="11">ÉQUIPEMENTS TERRAIN</text><text x="970" y="66" fill="#71808a" font-family="monospace" font-size="11">INFRASTRUCTURE GTB</text><text x="${supervisorX}" y="66" fill="#71808a" font-family="monospace" font-size="11">SUPERVISION</text>${connections.join('')}${uplinkConnections}${equipmentMarkup}${targetsMarkup}${supervisorsMarkup}</svg>`;
}

export function mapperToCsv(document: MapperDocument): string {
	const targetById = new Map(document.targets.map((target) => [target.id, target]));
	const supervisorById = new Map(document.supervisors.map((supervisor) => [supervisor.id, supervisor.name]));
	const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
	const segmentById = new Map(document.targets.flatMap((target) => target.segments.map((segment) => [segment.id, segment])));
	const rows = [['Équipement', 'Point', 'Type', 'Signal', 'Cible', 'Segment', 'Adresse équipement', 'Adresse', 'Superviseur', 'Remontée']];
	for (const equipment of document.equipment) {
		const segment = equipment.bus?.segmentId ? segmentById.get(equipment.bus.segmentId) : undefined;
		for (const point of equipment.points) {
			const target = point.targetId ? targetById.get(point.targetId) : undefined;
			rows.push([
				equipment.name,
				point.name,
				point.kind,
				point.signal,
				target?.name ?? '',
				segment?.name ?? '',
				segment ? equipment.bus?.address ?? '' : '',
				point.address,
				target?.supervisorId ? supervisorById.get(target.supervisorId) ?? '' : '',
				target?.supervisorId ? target.uplink : ''
			]);
		}
	}
	return rows.map((row) => row.map(escapeCsv).join(';')).join('\n');
}
