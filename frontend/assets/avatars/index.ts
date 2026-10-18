export const MASCOT_IMAGES: Record<string, any> = {
  // Base Archetypes
  tita_robust: require('./tita_robust.png'),
  tita_muscular: require('./tita_muscular.png'),
  tita_lean: require('./tita_lean.png'),
  tita_athletic: require('./tita_muscular.png'),
  gaia_robust: require('./gaia_robust.png'),
  gaia_athletic: require('./gaia_athletic.png'),
  gaia_lean: require('./gaia_lean.png'),
  gaia_muscular: require('./gaia_athletic.png'),

  // Titã: Os 10 Marcos Granulares Oficiais de Emagrecimento (92.5kg a 70.0kg)
  tita_m1: require('./milestones/tita_m1.jpg'),
  tita_m2: require('./milestones/tita_m2.jpg'),
  tita_m3: require('./milestones/tita_m3.jpg'),
  tita_m4: require('./milestones/tita_m4.jpg'),
  tita_m5: require('./milestones/tita_m5.jpg'),
  tita_m6: require('./milestones/tita_m6.jpg'),
  tita_m7: require('./milestones/tita_m7.jpg'),
  tita_m8: require('./milestones/tita_m8.jpg'),
  tita_m9: require('./milestones/tita_m9.jpg'),
  tita_m10: require('./milestones/tita_m10.jpg'),

  // Titã: Cenários de Ganho & Hipertrofia
  tita_gain_water: require('./milestones/tita_gain_water.jpg'),
  tita_gain_rebound: require('./milestones/tita_gain_rebound.jpg'),
  tita_gain_hypertrophy: require('./milestones/tita_gain_hypertrophy.jpg'),
  tita_h_juggernaut: require('./milestones/tita_h_juggernaut.jpg'),
  tita_h_colosso: require('./milestones/tita_h_colosso.jpg'),

  // Gaia: Os 10 Marcos Granulares Oficiais de Emagrecimento (82.0kg a 58.0kg)
  gaia_m1: require('./milestones/gaia_m1.png'),
  gaia_m2: require('./milestones/gaia_m2.png'),
  gaia_m3: require('./milestones/gaia_m3.png'),
  gaia_m4: require('./milestones/gaia_m4.png'),
  gaia_m5: require('./milestones/gaia_m5.png'),
  gaia_m6: require('./milestones/gaia_m6.jpg'),
  gaia_m7: require('./milestones/gaia_m7.jpg'),
  gaia_m8: require('./milestones/gaia_m8.jpg'),
  gaia_m9: require('./milestones/gaia_m9.jpg'),
  gaia_m10: require('./milestones/gaia_m10.jpg'),

  // Gaia: Cenários de Ganho & Hipertrofia
  gaia_gain_water: require('./milestones/gaia_gain_water.png'),
  gaia_gain_rebound: require('./milestones/gaia_gain_rebound.png'),
  gaia_gain_hypertrophy: require('./milestones/gaia_gain_hypertrophy.jpg'),
};

export function getMascotImage(assetKey: string): any {
  if (assetKey && MASCOT_IMAGES[assetKey]) return MASCOT_IMAGES[assetKey];
  if (assetKey && assetKey.startsWith('gaia')) {
    return MASCOT_IMAGES.gaia_athletic;
  }
  return MASCOT_IMAGES.tita_robust;
}

/**
 * Retorna o asset visual 2D correspondente ao marco específico (1 a 10) do mascote.
 */
export function getMilestoneMascotImage(mascotId: 'tita' | 'gaia', milestoneLevel: number): any {
  const clampedLevel = Math.min(Math.max(milestoneLevel || 1, 1), 10);
  const key = `${mascotId}_m${clampedLevel}`;
  return MASCOT_IMAGES[key] || (mascotId === 'gaia' ? MASCOT_IMAGES.gaia_athletic : MASCOT_IMAGES.tita_robust);
}
