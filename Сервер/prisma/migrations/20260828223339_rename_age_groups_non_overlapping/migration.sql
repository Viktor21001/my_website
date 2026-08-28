-- Возрастные группы раньше пересекались по граничным значениям
-- (16-20 и 20-25 делили "20", и так для каждой соседней пары).
-- RENAME VALUE меняет только подпись enum-значения — существующие
-- строки автоматически остаются на тех же значениях, данные не теряются.
ALTER TYPE "AgeGroup" RENAME VALUE 'AGE_20_25' TO 'AGE_21_25';
ALTER TYPE "AgeGroup" RENAME VALUE 'AGE_25_30' TO 'AGE_26_30';
ALTER TYPE "AgeGroup" RENAME VALUE 'AGE_30_35' TO 'AGE_31_35';
ALTER TYPE "AgeGroup" RENAME VALUE 'AGE_35_40' TO 'AGE_36_40';
ALTER TYPE "AgeGroup" RENAME VALUE 'AGE_40_PLUS' TO 'AGE_41_PLUS';

ALTER TABLE "User" ALTER COLUMN "ageGroup" SET DEFAULT 'AGE_26_30';
