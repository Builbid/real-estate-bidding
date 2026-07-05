-- Expand rcc_config enum for full 2/4/8 matrix permutations (14 total options)
alter type rcc_config add value if not exists 'ground_full';
alter type rcc_config add value if not exists 'g_plus_1_structural_full';
alter type rcc_config add value if not exists 'g_plus_1_full_structural';
alter type rcc_config add value if not exists 'g_plus_2_structural_structural_full';
alter type rcc_config add value if not exists 'g_plus_2_structural_full_full';
alter type rcc_config add value if not exists 'g_plus_2_full_structural_full';
alter type rcc_config add value if not exists 'g_plus_2_full_full_structural';
