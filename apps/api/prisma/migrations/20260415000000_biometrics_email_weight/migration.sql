-- ============================================================
-- Migration: 20260415000000_biometrics_email_weight
-- Adds: age/height to Profile, email verification to User,
--       WeightRecord table for backend weight tracking
-- ============================================================

-- 1. Profile: campos biomédicos opcionales
ALTER TABLE `Profile` ADD COLUMN `age` INTEGER NULL;
ALTER TABLE `Profile` ADD COLUMN `height` INTEGER NULL;

-- 2. User: verificación de email
--    DEFAULT TRUE para que los usuarios existentes queden como verificados
ALTER TABLE `User` ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE `User` ADD COLUMN `verificationToken` VARCHAR(191) NULL;
ALTER TABLE `User` ADD COLUMN `verificationTokenExpiry` DATETIME(3) NULL;
CREATE UNIQUE INDEX `User_verificationToken_key` ON `User`(`verificationToken`);

-- 3. WeightRecord: historial de peso por perfil y fecha
CREATE TABLE `WeightRecord` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `profileId` BIGINT NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `weight` DECIMAL(5, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WeightRecord` ADD CONSTRAINT `WeightRecord_profileId_fkey`
    FOREIGN KEY (`profileId`) REFERENCES `Profile`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX `WeightRecord_profileId_date_key` ON `WeightRecord`(`profileId`, `date`);
CREATE INDEX `WeightRecord_profileId_idx` ON `WeightRecord`(`profileId`);
