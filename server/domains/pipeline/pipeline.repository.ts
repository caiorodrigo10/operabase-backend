
import type { InsertPipelineStage, UpdatePipelineStage, InsertPipelineOpportunity, UpdatePipelineOpportunity, InsertPipelineActivity, UpdatePipelineActivity } from './pipeline.types';

export class PipelineRepository {
  constructor(private storage: any) {}

  // Pipeline Stages
  async getStagesByClinic(clinicId: number) {
    return this.storage.getStagesByClinic(clinicId);
  }

  async getStageById(id: number) {
    return this.storage.getStageById(id);
  }

  async createStage(data: InsertPipelineStage) {
    return this.storage.createStage(data);
  }

  async updateStage(id: number, data: UpdatePipelineStage) {
    return this.storage.updateStage(id, data);
  }

  async deleteStage(id: number) {
    return this.storage.deleteStage(id);
  }

  // Pipeline Opportunities
  async getOpportunitiesByClinic(clinicId: number) {
    return this.storage.getOpportunitiesByClinic(clinicId);
  }

  async getOpportunityById(id: number) {
    return this.storage.getOpportunityById(id);
  }

  async createOpportunity(data: InsertPipelineOpportunity) {
    return this.storage.createOpportunity(data);
  }

  async updateOpportunity(id: number, data: UpdatePipelineOpportunity) {
    return this.storage.updateOpportunity(id, data);
  }

  async deleteOpportunity(id: number) {
    return this.storage.deleteOpportunity(id);
  }

  async moveOpportunity(id: number, stageId: number) {
    return this.storage.moveOpportunity(id, stageId);
  }

  async getOpportunityHistory(id: number) {
    return this.storage.getOpportunityHistory(id);
  }

  async getOpportunityActivities(id: number) {
    return this.storage.getOpportunityActivities(id);
  }

  // Pipeline Activities
  async getActivitiesByClinic(clinicId: number) {
    return this.storage.getActivitiesByClinic(clinicId);
  }

  async getActivityById(id: number) {
    return this.storage.getActivityById(id);
  }

  async createActivity(data: InsertPipelineActivity) {
    return this.storage.createActivity(data);
  }

  async updateActivity(id: number, data: UpdatePipelineActivity) {
    return this.storage.updateActivity(id, data);
  }

  async deleteActivity(id: number) {
    return this.storage.deleteActivity(id);
  }

  async completeActivity(id: number) {
    return this.storage.completeActivity(id);
  }
}
