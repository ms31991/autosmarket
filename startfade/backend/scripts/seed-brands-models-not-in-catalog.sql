-- Brands + models that are NOT in Fleet Catalog API (fleetcatalog.disturbingbyte.pt).
-- That API already has 127 makes (BMW, Mercedes Benz, Audi, VW, Dacia, Lada, Maybach, Tesla, ...).
-- This seed adds the gap: mainly Chinese/new EU brands + some Balkan/old names.
-- Safe to re-run: skips existing Brand/Model names (case-insensitive). Does not delete anything.
-- SQL Server. Run against AutoMarket.

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRAN;

IF OBJECT_ID('tempdb..#Seed') IS NOT NULL DROP TABLE #Seed;
CREATE TABLE #Seed (
  Brand NVARCHAR(80) NOT NULL,
  BrandSlug NVARCHAR(80) NOT NULL,
  Model NVARCHAR(80) NOT NULL,
  ModelSlug NVARCHAR(120) NOT NULL
);

INSERT INTO #Seed (Brand, BrandSlug, Model, ModelSlug) VALUES
-- BYD
(N'BYD', N'byd', N'Atto 2', N'byd-atto-2'),
(N'BYD', N'byd', N'Atto 3', N'byd-atto-3'),
(N'BYD', N'byd', N'Dolphin', N'byd-dolphin'),
(N'BYD', N'byd', N'Seal', N'byd-seal'),
(N'BYD', N'byd', N'Seal U', N'byd-seal-u'),
(N'BYD', N'byd', N'Sealion 7', N'byd-sealion-7'),
(N'BYD', N'byd', N'Tang', N'byd-tang'),
(N'BYD', N'byd', N'Han', N'byd-han'),
(N'BYD', N'byd', N'Song Plus', N'byd-song-plus'),
(N'BYD', N'byd', N'Yuan Plus', N'byd-yuan-plus'),
(N'BYD', N'byd', N'Qin Plus', N'byd-qin-plus'),
(N'BYD', N'byd', N'Seal 6 DM-i', N'byd-seal-6-dm-i'),
(N'BYD', N'byd', N'Seal 5 DM-i', N'byd-seal-5-dm-i'),

-- Chery
(N'Chery', N'chery', N'Arrizo 5', N'chery-arrizo-5'),
(N'Chery', N'chery', N'Arrizo 8', N'chery-arrizo-8'),
(N'Chery', N'chery', N'Tiggo 2', N'chery-tiggo-2'),
(N'Chery', N'chery', N'Tiggo 4', N'chery-tiggo-4'),
(N'Chery', N'chery', N'Tiggo 4 Pro', N'chery-tiggo-4-pro'),
(N'Chery', N'chery', N'Tiggo 7', N'chery-tiggo-7'),
(N'Chery', N'chery', N'Tiggo 7 Pro', N'chery-tiggo-7-pro'),
(N'Chery', N'chery', N'Tiggo 8', N'chery-tiggo-8'),
(N'Chery', N'chery', N'Tiggo 8 Pro', N'chery-tiggo-8-pro'),
(N'Chery', N'chery', N'Tiggo 9', N'chery-tiggo-9'),
(N'Chery', N'chery', N'QQ', N'chery-qq'),

-- Omoda / Jaecoo (Chery sub-brands)
(N'Omoda', N'omoda', N'5', N'omoda-5'),
(N'Omoda', N'omoda', N'C5', N'omoda-c5'),
(N'Omoda', N'omoda', N'E5', N'omoda-e5'),
(N'Omoda', N'omoda', N'7', N'omoda-7'),
(N'Omoda', N'omoda', N'C7', N'omoda-c7'),
(N'Omoda', N'omoda', N'9', N'omoda-9'),
(N'Jaecoo', N'jaecoo', N'5', N'jaecoo-5'),
(N'Jaecoo', N'jaecoo', N'7', N'jaecoo-7'),
(N'Jaecoo', N'jaecoo', N'J7', N'jaecoo-j7'),
(N'Jaecoo', N'jaecoo', N'J8', N'jaecoo-j8'),

-- Haval / GWM / Tank / Ora
(N'Haval', N'haval', N'Jolion', N'haval-jolion'),
(N'Haval', N'haval', N'H6', N'haval-h6'),
(N'Haval', N'haval', N'H6 GT', N'haval-h6-gt'),
(N'Haval', N'haval', N'Dargo', N'haval-dargo'),
(N'Haval', N'haval', N'H9', N'haval-h9'),
(N'Haval', N'haval', N'F7', N'haval-f7'),
(N'Great Wall', N'great-wall', N'Poer', N'great-wall-poer'),
(N'Great Wall', N'great-wall', N'Wingle 5', N'great-wall-wingle-5'),
(N'Great Wall', N'great-wall', N'Wingle 7', N'great-wall-wingle-7'),
(N'Great Wall', N'great-wall', N'Steed', N'great-wall-steed'),
(N'Tank', N'tank', N'300', N'tank-300'),
(N'Tank', N'tank', N'400', N'tank-400'),
(N'Tank', N'tank', N'500', N'tank-500'),
(N'Tank', N'tank', N'700', N'tank-700'),
(N'Ora', N'ora', N'Funky Cat', N'ora-funky-cat'),
(N'Ora', N'ora', N'Good Cat', N'ora-good-cat'),
(N'Ora', N'ora', N'03', N'ora-03'),
(N'Ora', N'ora', N'07', N'ora-07'),

-- Other China / new EV
(N'Leapmotor', N'leapmotor', N'T03', N'leapmotor-t03'),
(N'Leapmotor', N'leapmotor', N'C10', N'leapmotor-c10'),
(N'Leapmotor', N'leapmotor', N'C11', N'leapmotor-c11'),
(N'Leapmotor', N'leapmotor', N'C16', N'leapmotor-c16'),
(N'Leapmotor', N'leapmotor', N'B10', N'leapmotor-b10'),
(N'Zeekr', N'zeekr', N'001', N'zeekr-001'),
(N'Zeekr', N'zeekr', N'007', N'zeekr-007'),
(N'Zeekr', N'zeekr', N'7X', N'zeekr-7x'),
(N'Zeekr', N'zeekr', N'X', N'zeekr-x'),
(N'Zeekr', N'zeekr', N'009', N'zeekr-009'),
(N'Lynk & Co', N'lynk-co', N'01', N'lynk-co-01'),
(N'Lynk & Co', N'lynk-co', N'02', N'lynk-co-02'),
(N'Lynk & Co', N'lynk-co', N'03', N'lynk-co-03'),
(N'Lynk & Co', N'lynk-co', N'08', N'lynk-co-08'),
(N'Lynk & Co', N'lynk-co', N'09', N'lynk-co-09'),
(N'Hongqi', N'hongqi', N'H5', N'hongqi-h5'),
(N'Hongqi', N'hongqi', N'H9', N'hongqi-h9'),
(N'Hongqi', N'hongqi', N'E-HS9', N'hongqi-e-hs9'),
(N'Hongqi', N'hongqi', N'HS5', N'hongqi-hs5'),
(N'Hongqi', N'hongqi', N'HS7', N'hongqi-hs7'),
(N'Changan', N'changan', N'Alsvin', N'changan-alsvin'),
(N'Changan', N'changan', N'Eado', N'changan-eado'),
(N'Changan', N'changan', N'CS35 Plus', N'changan-cs35-plus'),
(N'Changan', N'changan', N'CS55 Plus', N'changan-cs55-plus'),
(N'Changan', N'changan', N'CS75 Plus', N'changan-cs75-plus'),
(N'Changan', N'changan', N'CS95', N'changan-cs95'),
(N'Changan', N'changan', N'UNI-T', N'changan-uni-t'),
(N'Changan', N'changan', N'UNI-K', N'changan-uni-k'),
(N'Changan', N'changan', N'UNI-V', N'changan-uni-v'),
(N'Deepal', N'deepal', N'S05', N'deepal-s05'),
(N'Deepal', N'deepal', N'S07', N'deepal-s07'),
(N'Deepal', N'deepal', N'L07', N'deepal-l07'),
(N'Maxus', N'maxus', N'Deliver 9', N'maxus-deliver-9'),
(N'Maxus', N'maxus', N'G10', N'maxus-g10'),
(N'Maxus', N'maxus', N'T90', N'maxus-t90'),
(N'Maxus', N'maxus', N'MIFA 9', N'maxus-mifa-9'),
(N'Maxus', N'maxus', N'Euniq 5', N'maxus-euniq-5'),
(N'DFSK', N'dfsk', N'Glory 330', N'dfsk-glory-330'),
(N'DFSK', N'dfsk', N'Glory 560', N'dfsk-glory-560'),
(N'DFSK', N'dfsk', N'Glory 580', N'dfsk-glory-580'),
(N'DFSK', N'dfsk', N'Seres 3', N'dfsk-seres-3'),
(N'DFSK', N'dfsk', N'Fengon 500', N'dfsk-fengon-500'),
(N'DFSK', N'dfsk', N'Fengon 580', N'dfsk-fengon-580'),
(N'JAC', N'jac', N'J7', N'jac-j7'),
(N'JAC', N'jac', N'JS4', N'jac-js4'),
(N'JAC', N'jac', N'JS6', N'jac-js6'),
(N'JAC', N'jac', N'T8', N'jac-t8'),
(N'JAC', N'jac', N'iEV7S', N'jac-iev7s'),
(N'BAIC', N'baic', N'X35', N'baic-x35'),
(N'BAIC', N'baic', N'X55', N'baic-x55'),
(N'BAIC', N'baic', N'X7', N'baic-x7'),
(N'BAIC', N'baic', N'BJ40', N'baic-bj40'),
(N'BAIC', N'baic', N'EU5', N'baic-eu5'),
(N'Bestune', N'bestune', N'T77', N'bestune-t77'),
(N'Bestune', N'bestune', N'T99', N'bestune-t99'),
(N'Bestune', N'bestune', N'B70', N'bestune-b70'),
(N'Voyah', N'voyah', N'Free', N'voyah-free'),
(N'Voyah', N'voyah', N'Passion', N'voyah-passion'),
(N'Voyah', N'voyah', N'Dream', N'voyah-dream'),
(N'Seres', N'seres', N'3', N'seres-3'),
(N'Seres', N'seres', N'5', N'seres-5'),
(N'Seres', N'seres', N'SF5', N'seres-sf5'),
(N'Aiways', N'aiways', N'U5', N'aiways-u5'),
(N'Aiways', N'aiways', N'U6', N'aiways-u6'),
(N'Skywell', N'skywell', N'ET5', N'skywell-et5'),
(N'Skywell', N'skywell', N'BE11', N'skywell-be11'),
(N'Forthing', N'forthing', N'T5 Evo', N'forthing-t5-evo'),
(N'Forthing', N'forthing', N'U-Tour', N'forthing-u-tour'),
(N'Forthing', N'forthing', N'Friday', N'forthing-friday'),
(N'SWM', N'swm', N'G01', N'swm-g01'),
(N'SWM', N'swm', N'G05', N'swm-g05'),
(N'SWM', N'swm', N'G01F', N'swm-g01f'),
(N'Evo', N'evo', N'4', N'evo-4'),
(N'Evo', N'evo', N'5', N'evo-5'),
(N'Evo', N'evo', N'6', N'evo-6'),
(N'Evo', N'evo', N'7', N'evo-7'),
(N'Evo', N'evo', N'8', N'evo-8'),
(N'Sportequipe', N'sportequipe', N'6', N'sportequipe-6'),
(N'Sportequipe', N'sportequipe', N'7', N'sportequipe-7'),
(N'Sportequipe', N'sportequipe', N'8', N'sportequipe-8'),

-- Vans / light commercial not in catalog
(N'Iveco', N'iveco', N'Daily', N'iveco-daily'),
(N'Iveco', N'iveco', N'Massif', N'iveco-massif'),
(N'Piaggio', N'piaggio', N'Porter', N'piaggio-porter'),
(N'Piaggio', N'piaggio', N'Ape', N'piaggio-ape'),
(N'MAN', N'man', N'TGE', N'man-tge'),

-- Quadricycles
(N'Aixam', N'aixam', N'City', N'aixam-city'),
(N'Aixam', N'aixam', N'Coupe', N'aixam-coupe'),
(N'Aixam', N'aixam', N'Crossover', N'aixam-crossover'),
(N'Aixam', N'aixam', N'Minauto', N'aixam-minauto'),
(N'Ligier', N'ligier', N'JS50', N'ligier-js50'),
(N'Ligier', N'ligier', N'JS60', N'ligier-js60'),
(N'Ligier', N'ligier', N'Myli', N'ligier-myli'),
(N'Microcar', N'microcar', N'M.Go', N'microcar-m-go'),
(N'Microcar', N'microcar', N'Due', N'microcar-due'),
(N'Microcar', N'microcar', N'M8', N'microcar-m8'),

-- Tuner / heritage not in catalog as own make
(N'Alpina', N'alpina', N'B3', N'alpina-b3'),
(N'Alpina', N'alpina', N'B4', N'alpina-b4'),
(N'Alpina', N'alpina', N'B5', N'alpina-b5'),
(N'Alpina', N'alpina', N'B8', N'alpina-b8'),
(N'Alpina', N'alpina', N'D3', N'alpina-d3'),
(N'Alpina', N'alpina', N'D5', N'alpina-d5'),
(N'Alpina', N'alpina', N'XB7', N'alpina-xb7'),
(N'Alpina', N'alpina', N'XD3', N'alpina-xd3'),
(N'Rover', N'rover', N'25', N'rover-25'),
(N'Rover', N'rover', N'45', N'rover-45'),
(N'Rover', N'rover', N'75', N'rover-75'),
(N'Rover', N'rover', N'200', N'rover-200'),
(N'Rover', N'rover', N'400', N'rover-400'),
(N'Rover', N'rover', N'600', N'rover-600'),
(N'Rover', N'rover', N'800', N'rover-800'),
(N'Rover', N'rover', N'Streetwise', N'rover-streetwise'),

-- CIS / region
(N'UAZ', N'uaz', N'Patriot', N'uaz-patriot'),
(N'UAZ', N'uaz', N'Hunter', N'uaz-hunter'),
(N'UAZ', N'uaz', N'Bukhanka', N'uaz-bukhanka'),
(N'UAZ', N'uaz', N'Pickup', N'uaz-pickup'),
(N'UAZ', N'uaz', N'469', N'uaz-469'),
(N'GAZ', N'gaz', N'Volga', N'gaz-volga'),
(N'GAZ', N'gaz', N'Sobol', N'gaz-sobol'),
(N'GAZ', N'gaz', N'Gazelle', N'gaz-gazelle'),
(N'GAZ', N'gaz', N'Next', N'gaz-next'),
(N'ZAZ', N'zaz', N'Sens', N'zaz-sens'),
(N'ZAZ', N'zaz', N'Lanos', N'zaz-lanos'),
(N'ZAZ', N'zaz', N'Forza', N'zaz-forza'),
(N'ZAZ', N'zaz', N'Tavria', N'zaz-tavria'),
(N'Moskvich', N'moskvich', N'3', N'moskvich-3'),
(N'Moskvich', N'moskvich', N'6', N'moskvich-6'),
(N'Moskvich', N'moskvich', N'2140', N'moskvich-2140'),
(N'Moskvich', N'moskvich', N'412', N'moskvich-412');

INSERT INTO Brands (Name, Slug)
SELECT DISTINCT s.Brand, s.BrandSlug
FROM #Seed s
WHERE NOT EXISTS (
  SELECT 1
  FROM Brands b
  WHERE LOWER(LTRIM(RTRIM(b.Name))) = LOWER(LTRIM(RTRIM(s.Brand)))
)
AND NOT EXISTS (
  SELECT 1
  FROM Brands b
  WHERE LOWER(LTRIM(RTRIM(b.Slug))) = LOWER(LTRIM(RTRIM(s.BrandSlug)))
);

INSERT INTO VehicleModels (Name, Slug, BrandId)
SELECT s.Model, s.ModelSlug, b.Id
FROM #Seed s
INNER JOIN Brands b
  ON LOWER(LTRIM(RTRIM(b.Name))) = LOWER(LTRIM(RTRIM(s.Brand)))
WHERE NOT EXISTS (
  SELECT 1
  FROM VehicleModels m
  WHERE m.BrandId = b.Id
    AND LOWER(LTRIM(RTRIM(m.Name))) = LOWER(LTRIM(RTRIM(s.Model)))
)
AND NOT EXISTS (
  SELECT 1
  FROM VehicleModels m
  WHERE LOWER(LTRIM(RTRIM(m.Slug))) = LOWER(LTRIM(RTRIM(s.ModelSlug)))
);

SELECT
  (SELECT COUNT(*) FROM #Seed) AS SeedRows,
  (SELECT COUNT(DISTINCT Brand) FROM #Seed) AS SeedBrands;

COMMIT;
DROP TABLE #Seed;
