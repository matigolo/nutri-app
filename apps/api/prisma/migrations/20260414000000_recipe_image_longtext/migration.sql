-- AlterTable: ampliar imageUrl de VARCHAR(191) a LONGTEXT para permitir imagenes en base64
ALTER TABLE `Recipe` MODIFY COLUMN `imageUrl` LONGTEXT NULL;
