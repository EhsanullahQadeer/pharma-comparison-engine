-- AlterTable
ALTER TABLE "DiscoverySource" ADD COLUMN     "configuredCredentialKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "credentialsCiphertext" TEXT;
