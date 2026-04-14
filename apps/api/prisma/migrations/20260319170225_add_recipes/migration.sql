/*
  Warnings:

  - Added the required column `ingredients` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profileId` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `steps` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Recipe` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Recipe` ADD COLUMN `calories` INTEGER NULL,
    ADD COLUMN `imageUrl` VARCHAR(191) NULL,
    ADD COLUMN `ingredients` JSON NOT NULL,
    ADD COLUMN `profileId` BIGINT NOT NULL,
    ADD COLUMN `steps` JSON NOT NULL,
    ADD COLUMN `timeMinutes` INTEGER NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE INDEX `Recipe_title_idx` ON `Recipe`(`title`);

-- CreateIndex
CREATE INDEX `Recipe_createdAt_idx` ON `Recipe`(`createdAt`);

-- AddForeignKey
ALTER TABLE `Recipe` ADD CONSTRAINT `Recipe_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `Profile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `favorite` RENAME INDEX `Favorite_recipeId_fkey` TO `Favorite_recipeId_idx`;
