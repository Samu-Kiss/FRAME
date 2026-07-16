-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'TEAM');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('COMMERCIAL', 'MUSIC_VIDEO', 'SHORT_FILM', 'FEATURE_FILM', 'DOCUMENTARY', 'CONTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DEVELOPMENT', 'PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION', 'DELIVERED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('DIRECTION', 'PRODUCTION', 'PHOTOGRAPHY', 'ART', 'MAKEUP_HAIR', 'WARDROBE', 'SOUND', 'POST', 'TALENT', 'CLIENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('TALENT', 'CREW', 'POST_CREW', 'CLIENT');

-- CreateEnum
CREATE TYPE "CrewType" AS ENUM ('HEAD_OF_DEPARTMENT', 'OPERATOR', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "DaylightType" AS ENUM ('DAWN', 'MORNING', 'MIDDAY', 'AFTERNOON', 'SUNSET', 'NIGHT', 'DEEP_NIGHT', 'STUDIO');

-- CreateEnum
CREATE TYPE "FrameSize" AS ENUM ('ECU', 'CU', 'MCU', 'MS', 'MLS', 'LS', 'ELS', 'AERIAL', 'POV', 'OTS', 'TWO_SHOT', 'INSERT', 'OTHER');

-- CreateEnum
CREATE TYPE "CameraMovement" AS ENUM ('STATIC', 'PAN', 'TILT', 'DOLLY', 'STEADICAM', 'HANDHELD', 'DRONE', 'CRANE', 'ZOOM', 'PUSH_IN', 'PULL_OUT', 'ARC', 'OTHER');

-- CreateEnum
CREATE TYPE "CameraAngle" AS ENUM ('EYE_LEVEL', 'HIGH_ANGLE', 'LOW_ANGLE', 'DUTCH', 'BIRDS_EYE', 'WORMS_EYE');

-- CreateEnum
CREATE TYPE "ShotStatus" AS ENUM ('NOT_FILMED', 'IN_PROGRESS', 'FILMED', 'APPROVED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('INTERIOR', 'EXTERIOR', 'STUDIO', 'NATURAL', 'URBAN', 'RURAL', 'WATER', 'OTHER');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'IN_PROCESS', 'OBTAINED');

-- CreateEnum
CREATE TYPE "PropCategory" AS ENUM ('PROP', 'SET_DRESSING', 'VEHICLE', 'FOOD', 'WEAPON', 'DOCUMENT', 'TECH', 'OTHER');

-- CreateEnum
CREATE TYPE "PropStatus" AS ENUM ('SEARCHING', 'IN_FABRICATION', 'CONFIRMED', 'IN_STORAGE', 'ON_SET', 'RETURNED');

-- CreateEnum
CREATE TYPE "PropSource" AS ENUM ('OWN', 'RENTED', 'PURCHASED', 'BORROWED');

-- CreateEnum
CREATE TYPE "StylingItemStatus" AS ENUM ('SEARCHING', 'CONFIRMED', 'ON_LOAN', 'PURCHASED');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('CAMERA', 'LENS', 'STEADICAM', 'SLIDER', 'DRONE', 'LIGHTING', 'SOUND', 'GRIP', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ChangeAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'RESTORED');

-- CreateEnum
CREATE TYPE "ScheduleBlockType" AS ENUM ('SETUP', 'SHOOTING', 'CATERING', 'BREAK', 'WARDROBE_CHANGE', 'TRAVEL', 'PICKUP', 'WRAP', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductionDayStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "MoodboardItemType" AS ENUM ('IMAGE', 'VIDEO_REF', 'COLOR_SWATCH', 'TEXT_NOTE', 'URL_EMBED');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('CALL_SHEET', 'SHOT_LIST', 'PRODUCTION_SCHEDULE', 'SCENE_BREAKDOWN', 'SCRIPT', 'STRIPBOARD', 'TALENT_SCHEDULE', 'PROPS_LIST', 'EQUIPMENT_LIST', 'SLATE_PDF', 'SLATE_PNG');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "plan" "PlanTier" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "client" TEXT,
    "brand" TEXT,
    "description" JSONB,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DEVELOPMENT',
    "shootDates" JSONB,
    "creationSource" TEXT NOT NULL DEFAULT 'blank',
    "clonedFromId" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectRole" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Act" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "description" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Act_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "actId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" JSONB,
    "scriptRef" JSONB,
    "scriptId" TEXT,
    "locationId" TEXT,
    "daylight" "DaylightType" NOT NULL DEFAULT 'MORNING',
    "estimatedDuration" INTEGER,
    "status" "ShotStatus" NOT NULL DEFAULT 'NOT_FILMED',
    "notes" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shot" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "shotNumber" TEXT NOT NULL,
    "shotName" TEXT NOT NULL,
    "description" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "frameSize" "FrameSize",
    "lensSize" TEXT,
    "cameraMovements" "CameraMovement"[],
    "cameraAngle" "CameraAngle",
    "voiceover" JSONB,
    "soundEffects" TEXT[],
    "musicRef" TEXT,
    "estimatedDuration" INTEGER,
    "filmed" BOOLEAN NOT NULL DEFAULT false,
    "takes" INTEGER,
    "selectedTake" INTEGER,
    "postNotes" JSONB,
    "notes" JSONB,
    "status" "ShotStatus" NOT NULL DEFAULT 'NOT_FILMED',
    "slateConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "department" "Department" NOT NULL,
    "role" TEXT NOT NULL,
    "type" "PersonType" NOT NULL,
    "callTime" TEXT,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Talent" (
    "personId" TEXT NOT NULL,
    "characterName" TEXT,
    "agencyName" TEXT,
    "agencyContact" TEXT,
    "measurements" JSONB,
    "portfolio" TEXT[],
    "availability" JSONB,

    CONSTRAINT "Talent_pkey" PRIMARY KEY ("personId")
);

-- CreateTable
CREATE TABLE "Crew" (
    "personId" TEXT NOT NULL,
    "crewType" "CrewType" NOT NULL,
    "vehicle" TEXT,

    CONSTRAINT "Crew_pkey" PRIMARY KEY ("personId")
);

-- CreateTable
CREATE TABLE "PostCrew" (
    "personId" TEXT NOT NULL,
    "deliverables" TEXT[],
    "software" TEXT[],
    "availability" JSONB,

    CONSTRAINT "PostCrew_pkey" PRIMARY KEY ("personId")
);

-- CreateTable
CREATE TABLE "ClientPerson" (
    "personId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "position" TEXT,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ClientPerson_pkey" PRIMARY KEY ("personId")
);

-- CreateTable
CREATE TABLE "ShotPerson" (
    "id" TEXT NOT NULL,
    "shotId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT,
    "action" TEXT,
    "emotion" TEXT,

    CONSTRAINT "ShotPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "address" TEXT,
    "coordinates" JSONB,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "permitRequired" BOOLEAN NOT NULL DEFAULT false,
    "permitStatus" "PermitStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "scoutingNotes" JSONB,
    "accessNotes" JSONB,
    "powerAvailable" BOOLEAN NOT NULL DEFAULT false,
    "amenities" TEXT[],
    "availableDates" JSONB,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Styling" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "lookName" TEXT NOT NULL,
    "description" JSONB,
    "hairRef" JSONB,
    "makeupRef" JSONB,
    "notes" JSONB,

    CONSTRAINT "Styling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Garment" (
    "id" TEXT NOT NULL,
    "stylingId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "brand" TEXT,
    "color" TEXT NOT NULL,
    "size" TEXT,
    "status" "StylingItemStatus" NOT NULL DEFAULT 'SEARCHING',
    "photoId" TEXT,

    CONSTRAINT "Garment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accessory" (
    "id" TEXT NOT NULL,
    "stylingId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "brand" TEXT,
    "color" TEXT NOT NULL,
    "size" TEXT,
    "status" "StylingItemStatus" NOT NULL DEFAULT 'SEARCHING',
    "photoId" TEXT,

    CONSTRAINT "Accessory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShotStyling" (
    "shotId" TEXT NOT NULL,
    "stylingId" TEXT NOT NULL,

    CONSTRAINT "ShotStyling_pkey" PRIMARY KEY ("shotId","stylingId")
);

-- CreateTable
CREATE TABLE "Prop" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" JSONB,
    "category" "PropCategory" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "PropStatus" NOT NULL DEFAULT 'SEARCHING',
    "source" "PropSource",
    "sourceName" TEXT,
    "cost" DOUBLE PRECISION,
    "notes" JSONB,

    CONSTRAINT "Prop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneProp" (
    "sceneId" TEXT NOT NULL,
    "propId" TEXT NOT NULL,

    CONSTRAINT "SceneProp_pkey" PRIMARY KEY ("sceneId","propId")
);

-- CreateTable
CREATE TABLE "ShotProp" (
    "shotId" TEXT NOT NULL,
    "propId" TEXT NOT NULL,

    CONSTRAINT "ShotProp_pkey" PRIMARY KEY ("shotId","propId")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "rentalSource" TEXT,
    "availableDates" JSONB,
    "notes" TEXT,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonEquipment" (
    "crewId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "PersonEquipment_pkey" PRIMARY KEY ("crewId","equipmentId")
);

-- CreateTable
CREATE TABLE "ShotEquipment" (
    "shotId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "ShotEquipment_pkey" PRIMARY KEY ("shotId","equipmentId")
);

-- CreateTable
CREATE TABLE "ProductionDay" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "generalCallTime" TEXT NOT NULL,
    "generalNotes" JSONB,
    "status" "ProductionDayStatus" NOT NULL DEFAULT 'PLANNED',

    CONSTRAINT "ProductionDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionDayLocation" (
    "productionDayId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "ProductionDayLocation_pkey" PRIMARY KEY ("productionDayId","locationId")
);

-- CreateTable
CREATE TABLE "ScheduleBlock" (
    "id" TEXT NOT NULL,
    "productionDayId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "type" "ScheduleBlockType" NOT NULL,
    "label" TEXT NOT NULL,
    "parallel" BOOLEAN NOT NULL DEFAULT false,
    "parallelGroupId" TEXT,
    "locationId" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScheduleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleBlockShot" (
    "scheduleBlockId" TEXT NOT NULL,
    "shotId" TEXT NOT NULL,

    CONSTRAINT "ScheduleBlockShot_pkey" PRIMARY KEY ("scheduleBlockId","shotId")
);

-- CreateTable
CREATE TABLE "CrewCall" (
    "id" TEXT NOT NULL,
    "productionDayId" TEXT NOT NULL,
    "personId" TEXT,
    "department" "Department",
    "callTime" TEXT NOT NULL,

    CONSTRAINT "CrewCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentCall" (
    "id" TEXT NOT NULL,
    "productionDayId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "callTime" TEXT NOT NULL,
    "makeupCallTime" TEXT,
    "onSetTime" TEXT,
    "wrapTime" TEXT,

    CONSTRAINT "TalentCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personId" TEXT,
    "title" TEXT NOT NULL,
    "description" JSONB,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "linkedEntityType" TEXT,
    "linkedEntityId" TEXT,
    "propId" TEXT,
    "locationId" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodboardBoard" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "layout" TEXT NOT NULL DEFAULT 'freeform',
    "projectId" TEXT,
    "sceneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodboardBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodboardItem" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "type" "MoodboardItemType" NOT NULL,
    "assetId" TEXT,
    "color" TEXT,
    "content" TEXT,
    "caption" TEXT,
    "posX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MoodboardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "alt" TEXT,
    "uploadedById" TEXT NOT NULL,
    "shotId" TEXT,
    "personId" TEXT,
    "locationId" TEXT,
    "stylingId" TEXT,
    "propId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "ChangeAction" NOT NULL,
    "diff" JSONB,
    "note" TEXT,
    "namedVersion" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ExportType" NOT NULL,
    "entityId" TEXT,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "fileUrl" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SceneToStyling" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SceneToStyling_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Script_projectId_key" ON "Script"("projectId");

-- CreateIndex
CREATE INDEX "Act_projectId_idx" ON "Act"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Act_projectId_number_key" ON "Act"("projectId", "number");

-- CreateIndex
CREATE INDEX "Scene_actId_idx" ON "Scene"("actId");

-- CreateIndex
CREATE INDEX "Scene_projectId_idx" ON "Scene"("projectId");

-- CreateIndex
CREATE INDEX "Scene_locationId_idx" ON "Scene"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_actId_number_key" ON "Scene"("actId", "number");

-- CreateIndex
CREATE INDEX "Shot_sceneId_idx" ON "Shot"("sceneId");

-- CreateIndex
CREATE INDEX "Shot_projectId_idx" ON "Shot"("projectId");

-- CreateIndex
CREATE INDEX "Shot_filmed_idx" ON "Shot"("filmed");

-- CreateIndex
CREATE INDEX "Shot_status_idx" ON "Shot"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Shot_sceneId_shotNumber_key" ON "Shot"("sceneId", "shotNumber");

-- CreateIndex
CREATE INDEX "Person_projectId_idx" ON "Person"("projectId");

-- CreateIndex
CREATE INDEX "Person_type_idx" ON "Person"("type");

-- CreateIndex
CREATE INDEX "Person_department_idx" ON "Person"("department");

-- CreateIndex
CREATE INDEX "Person_userId_idx" ON "Person"("userId");

-- CreateIndex
CREATE INDEX "ShotPerson_shotId_idx" ON "ShotPerson"("shotId");

-- CreateIndex
CREATE INDEX "ShotPerson_personId_idx" ON "ShotPerson"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "ShotPerson_shotId_personId_key" ON "ShotPerson"("shotId", "personId");

-- CreateIndex
CREATE INDEX "Location_projectId_idx" ON "Location"("projectId");

-- CreateIndex
CREATE INDEX "Styling_projectId_idx" ON "Styling"("projectId");

-- CreateIndex
CREATE INDEX "Styling_characterId_idx" ON "Styling"("characterId");

-- CreateIndex
CREATE INDEX "Garment_stylingId_idx" ON "Garment"("stylingId");

-- CreateIndex
CREATE INDEX "Accessory_stylingId_idx" ON "Accessory"("stylingId");

-- CreateIndex
CREATE INDEX "Prop_projectId_idx" ON "Prop"("projectId");

-- CreateIndex
CREATE INDEX "Prop_status_idx" ON "Prop"("status");

-- CreateIndex
CREATE INDEX "Equipment_projectId_idx" ON "Equipment"("projectId");

-- CreateIndex
CREATE INDEX "Equipment_type_idx" ON "Equipment"("type");

-- CreateIndex
CREATE INDEX "ProductionDay_projectId_idx" ON "ProductionDay"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionDay_projectId_date_key" ON "ProductionDay"("projectId", "date");

-- CreateIndex
CREATE INDEX "ScheduleBlock_productionDayId_idx" ON "ScheduleBlock"("productionDayId");

-- CreateIndex
CREATE INDEX "ScheduleBlock_parallelGroupId_idx" ON "ScheduleBlock"("parallelGroupId");

-- CreateIndex
CREATE INDEX "CrewCall_productionDayId_idx" ON "CrewCall"("productionDayId");

-- CreateIndex
CREATE INDEX "TalentCall_productionDayId_idx" ON "TalentCall"("productionDayId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_personId_idx" ON "Task"("personId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_linkedEntityType_linkedEntityId_idx" ON "Task"("linkedEntityType", "linkedEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "MoodboardBoard_projectId_key" ON "MoodboardBoard"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "MoodboardBoard_sceneId_key" ON "MoodboardBoard"("sceneId");

-- CreateIndex
CREATE INDEX "MoodboardItem_boardId_idx" ON "MoodboardItem"("boardId");

-- CreateIndex
CREATE INDEX "Asset_projectId_idx" ON "Asset"("projectId");

-- CreateIndex
CREATE INDEX "Asset_shotId_idx" ON "Asset"("shotId");

-- CreateIndex
CREATE INDEX "Asset_personId_idx" ON "Asset"("personId");

-- CreateIndex
CREATE INDEX "Asset_locationId_idx" ON "Asset"("locationId");

-- CreateIndex
CREATE INDEX "ChangeEntry_projectId_idx" ON "ChangeEntry"("projectId");

-- CreateIndex
CREATE INDEX "ChangeEntry_entityType_entityId_idx" ON "ChangeEntry"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ChangeEntry_userId_idx" ON "ChangeEntry"("userId");

-- CreateIndex
CREATE INDEX "ChangeEntry_timestamp_idx" ON "ChangeEntry"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "ExportJob_projectId_idx" ON "ExportJob"("projectId");

-- CreateIndex
CREATE INDEX "ExportJob_userId_idx" ON "ExportJob"("userId");

-- CreateIndex
CREATE INDEX "ExportJob_status_idx" ON "ExportJob"("status");

-- CreateIndex
CREATE INDEX "ExportJob_userId_createdAt_idx" ON "ExportJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "_SceneToStyling_B_index" ON "_SceneToStyling"("B");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Act" ADD CONSTRAINT "Act_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_actId_fkey" FOREIGN KEY ("actId") REFERENCES "Act"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Talent" ADD CONSTRAINT "Talent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Crew" ADD CONSTRAINT "Crew_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostCrew" ADD CONSTRAINT "PostCrew_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPerson" ADD CONSTRAINT "ClientPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotPerson" ADD CONSTRAINT "ShotPerson_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotPerson" ADD CONSTRAINT "ShotPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Styling" ADD CONSTRAINT "Styling_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Styling" ADD CONSTRAINT "Styling_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Garment" ADD CONSTRAINT "Garment_stylingId_fkey" FOREIGN KEY ("stylingId") REFERENCES "Styling"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accessory" ADD CONSTRAINT "Accessory_stylingId_fkey" FOREIGN KEY ("stylingId") REFERENCES "Styling"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotStyling" ADD CONSTRAINT "ShotStyling_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotStyling" ADD CONSTRAINT "ShotStyling_stylingId_fkey" FOREIGN KEY ("stylingId") REFERENCES "Styling"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prop" ADD CONSTRAINT "Prop_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneProp" ADD CONSTRAINT "SceneProp_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneProp" ADD CONSTRAINT "SceneProp_propId_fkey" FOREIGN KEY ("propId") REFERENCES "Prop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotProp" ADD CONSTRAINT "ShotProp_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotProp" ADD CONSTRAINT "ShotProp_propId_fkey" FOREIGN KEY ("propId") REFERENCES "Prop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonEquipment" ADD CONSTRAINT "PersonEquipment_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew"("personId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonEquipment" ADD CONSTRAINT "PersonEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotEquipment" ADD CONSTRAINT "ShotEquipment_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotEquipment" ADD CONSTRAINT "ShotEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDay" ADD CONSTRAINT "ProductionDay_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDayLocation" ADD CONSTRAINT "ProductionDayLocation_productionDayId_fkey" FOREIGN KEY ("productionDayId") REFERENCES "ProductionDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDayLocation" ADD CONSTRAINT "ProductionDayLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_productionDayId_fkey" FOREIGN KEY ("productionDayId") REFERENCES "ProductionDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlockShot" ADD CONSTRAINT "ScheduleBlockShot_scheduleBlockId_fkey" FOREIGN KEY ("scheduleBlockId") REFERENCES "ScheduleBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlockShot" ADD CONSTRAINT "ScheduleBlockShot_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewCall" ADD CONSTRAINT "CrewCall_productionDayId_fkey" FOREIGN KEY ("productionDayId") REFERENCES "ProductionDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewCall" ADD CONSTRAINT "CrewCall_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentCall" ADD CONSTRAINT "TalentCall_productionDayId_fkey" FOREIGN KEY ("productionDayId") REFERENCES "ProductionDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentCall" ADD CONSTRAINT "TalentCall_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_propId_fkey" FOREIGN KEY ("propId") REFERENCES "Prop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodboardBoard" ADD CONSTRAINT "MoodboardBoard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodboardBoard" ADD CONSTRAINT "MoodboardBoard_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodboardItem" ADD CONSTRAINT "MoodboardItem_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "MoodboardBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodboardItem" ADD CONSTRAINT "MoodboardItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_stylingId_fkey" FOREIGN KEY ("stylingId") REFERENCES "Styling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_propId_fkey" FOREIGN KEY ("propId") REFERENCES "Prop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEntry" ADD CONSTRAINT "ChangeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEntry" ADD CONSTRAINT "ChangeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SceneToStyling" ADD CONSTRAINT "_SceneToStyling_A_fkey" FOREIGN KEY ("A") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SceneToStyling" ADD CONSTRAINT "_SceneToStyling_B_fkey" FOREIGN KEY ("B") REFERENCES "Styling"("id") ON DELETE CASCADE ON UPDATE CASCADE;
