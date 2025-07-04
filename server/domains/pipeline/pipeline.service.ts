
import { PipelineRepository } from './pipeline.repository';
import type { InsertPipelineStage, UpdatePipelineStage, InsertPipelineOpportunity, UpdatePipelineOpportunity, InsertPipelineActivity, UpdatePipelineActivity } from './pipeline.types';

export class PipelineService {
  constructor(private repository: PipelineRepository) {}

  // Pipeline Stages
  async getStagesByClinic(clinicId: number) {
    return this.repository.getStagesByClinic(clinicId);
  }

  async getStageById(id: number) {
    const stage = await this.repository.getStageById(id);
    if (!stage) {
      throw new Error('Stage não encontrado');
    }
    return stage;
  }

  async createStage(data: InsertPipelineStage) {
    // Set position if not provided
    if (!data.position) {
      const stages = await this.repository.getStagesByClinic(data.clinic_id);
      data.position = stages.length;
    }

    return this.repository.createStage(data);
  }

  async updateStage(id: number, data: UpdatePipelineStage) {
    const existingStage = await this.repository.getStageById(id);
    if (!existingStage) {
      throw new Error('Stage não encontrado');
    }

    return this.repository.updateStage(id, data);
  }

  async deleteStage(id: number) {
    const existingStage = await this.repository.getStageById(id);
    if (!existingStage) {
      throw new Error('Stage não encontrado');
    }

    // Check if stage has opportunities
    const opportunities = await this.repository.getOpportunitiesByClinic(existingStage.clinic_id);
    const stageOpportunities = opportunities.filter(opp => opp.stage_id === id);
    
    if (stageOpportunities.length > 0) {
      throw new Error('Não é possível deletar um stage que possui oportunidades');
    }

    return this.repository.deleteStage(id);
  }

  // Pipeline Opportunities
  async getOpportunitiesByClinic(clinicId: number) {
    return this.repository.getOpportunitiesByClinic(clinicId);
  }

  async getOpportunityById(id: number) {
    const opportunity = await this.repository.getOpportunityById(id);
    if (!opportunity) {
      throw new Error('Oportunidade não encontrada');
    }
    return opportunity;
  }

  async createOpportunity(data: InsertPipelineOpportunity) {
    // Validate stage exists
    const stage = await this.repository.getStageById(data.stage_id);
    if (!stage) {
      throw new Error('Stage não encontrado');
    }

    if (stage.clinic_id !== data.clinic_id) {
      throw new Error('Stage não pertence à clínica especificada');
    }

    return this.repository.createOpportunity(data);
  }

  async updateOpportunity(id: number, data: UpdatePipelineOpportunity) {
    const existingOpportunity = await this.repository.getOpportunityById(id);
    if (!existingOpportunity) {
      throw new Error('Oportunidade não encontrada');
    }

    // Validate stage if being updated
    if (data.stage_id) {
      const stage = await this.repository.getStageById(data.stage_id);
      if (!stage) {
        throw new Error('Stage não encontrado');
      }

      if (stage.clinic_id !== existingOpportunity.clinic_id) {
        throw new Error('Stage não pertence à mesma clínica da oportunidade');
      }
    }

    return this.repository.updateOpportunity(id, data);
  }

  async deleteOpportunity(id: number) {
    const existingOpportunity = await this.repository.getOpportunityById(id);
    if (!existingOpportunity) {
      throw new Error('Oportunidade não encontrada');
    }

    return this.repository.deleteOpportunity(id);
  }

  async moveOpportunity(id: number, stageId: number) {
    const opportunity = await this.repository.getOpportunityById(id);
    if (!opportunity) {
      throw new Error('Oportunidade não encontrada');
    }

    const stage = await this.repository.getStageById(stageId);
    if (!stage) {
      throw new Error('Stage não encontrado');
    }

    if (stage.clinic_id !== opportunity.clinic_id) {
      throw new Error('Stage não pertence à mesma clínica da oportunidade');
    }

    return this.repository.moveOpportunity(id, stageId);
  }

  async getOpportunityHistory(id: number) {
    const opportunity = await this.repository.getOpportunityById(id);
    if (!opportunity) {
      throw new Error('Oportunidade não encontrada');
    }

    return this.repository.getOpportunityHistory(id);
  }

  async getOpportunityActivities(id: number) {
    const opportunity = await this.repository.getOpportunityById(id);
    if (!opportunity) {
      throw new Error('Oportunidade não encontrada');
    }

    return this.repository.getOpportunityActivities(id);
  }

  // Pipeline Activities
  async getActivitiesByClinic(clinicId: number) {
    return this.repository.getActivitiesByClinic(clinicId);
  }

  async getActivityById(id: number) {
    const activity = await this.repository.getActivityById(id);
    if (!activity) {
      throw new Error('Atividade não encontrada');
    }
    return activity;
  }

  async createActivity(data: InsertPipelineActivity) {
    // Validate opportunity exists
    const opportunity = await this.repository.getOpportunityById(data.opportunity_id);
    if (!opportunity) {
      throw new Error('Oportunidade não encontrada');
    }

    if (opportunity.clinic_id !== data.clinic_id) {
      throw new Error('Oportunidade não pertence à clínica especificada');
    }

    return this.repository.createActivity(data);
  }

  async updateActivity(id: number, data: UpdatePipelineActivity) {
    const existingActivity = await this.repository.getActivityById(id);
    if (!existingActivity) {
      throw new Error('Atividade não encontrada');
    }

    return this.repository.updateActivity(id, data);
  }

  async deleteActivity(id: number) {
    const existingActivity = await this.repository.getActivityById(id);
    if (!existingActivity) {
      throw new Error('Atividade não encontrada');
    }

    return this.repository.deleteActivity(id);
  }

  async completeActivity(id: number) {
    const existingActivity = await this.repository.getActivityById(id);
    if (!existingActivity) {
      throw new Error('Atividade não encontrada');
    }

    return this.repository.completeActivity(id);
  }
}
