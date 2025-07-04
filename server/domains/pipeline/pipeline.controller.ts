
import { Request, Response } from 'express';
import { PipelineService } from './pipeline.service';
import { insertPipelineStageSchema, updatePipelineStageSchema, insertPipelineOpportunitySchema, updatePipelineOpportunitySchema, insertPipelineActivitySchema, updatePipelineActivitySchema } from './pipeline.types';

export class PipelineController {
  constructor(private service: PipelineService) {}

  // Pipeline Stages
  getStagesByClinic = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: 'ID da clínica deve ser um número' });
      }

      const stages = await this.service.getStagesByClinic(clinicId);
      res.json(stages);
    } catch (error) {
      console.error('Error getting pipeline stages:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  getStageById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      const stage = await this.service.getStageById(id);
      res.json(stage);
    } catch (error) {
      console.error('Error getting pipeline stage:', error);
      if (error.message === 'Stage não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  createStage = async (req: Request, res: Response) => {
    try {
      const validatedData = insertPipelineStageSchema.parse(req.body);
      const stage = await this.service.createStage(validatedData);
      res.status(201).json(stage);
    } catch (error) {
      console.error('Error creating pipeline stage:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  updateStage = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      const validatedData = updatePipelineStageSchema.parse(req.body);
      const stage = await this.service.updateStage(id, validatedData);
      res.json(stage);
    } catch (error) {
      console.error('Error updating pipeline stage:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      }
      if (error.message === 'Stage não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  deleteStage = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      await this.service.deleteStage(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting pipeline stage:', error);
      if (error.message === 'Stage não encontrado') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Não é possível deletar um stage que possui oportunidades') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Pipeline Opportunities
  getOpportunitiesByClinic = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.query.clinic_id as string);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: 'clinic_id deve ser um número' });
      }

      const opportunities = await this.service.getOpportunitiesByClinic(clinicId);
      res.json(opportunities);
    } catch (error) {
      console.error('Error getting pipeline opportunities:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  getOpportunityById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      const opportunity = await this.service.getOpportunityById(id);
      res.json(opportunity);
    } catch (error) {
      console.error('Error getting pipeline opportunity:', error);
      if (error.message === 'Oportunidade não encontrada') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  createOpportunity = async (req: Request, res: Response) => {
    try {
      const validatedData = insertPipelineOpportunitySchema.parse(req.body);
      const opportunity = await this.service.createOpportunity(validatedData);
      res.status(201).json(opportunity);
    } catch (error) {
      console.error('Error creating pipeline opportunity:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      }
      if (error.message.includes('não encontrado') || error.message.includes('não pertence')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  updateOpportunity = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      const validatedData = updatePipelineOpportunitySchema.parse(req.body);
      const opportunity = await this.service.updateOpportunity(id, validatedData);
      res.json(opportunity);
    } catch (error) {
      console.error('Error updating pipeline opportunity:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      }
      if (error.message === 'Oportunidade não encontrada') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('não encontrado') || error.message.includes('não pertence')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  deleteOpportunity = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      await this.service.deleteOpportunity(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting pipeline opportunity:', error);
      if (error.message === 'Oportunidade não encontrada') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  moveOpportunity = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      const { stage_id } = req.body;
      if (!stage_id || isNaN(parseInt(stage_id))) {
        return res.status(400).json({ error: 'stage_id é obrigatório e deve ser um número' });
      }

      const result = await this.service.moveOpportunity(id, parseInt(stage_id));
      res.json(result);
    } catch (error) {
      console.error('Error moving pipeline opportunity:', error);
      if (error.message.includes('não encontrad') || error.message.includes('não pertence')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  getOpportunityHistory = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      const history = await this.service.getOpportunityHistory(id);
      res.json(history);
    } catch (error) {
      console.error('Error getting opportunity history:', error);
      if (error.message === 'Oportunidade não encontrada') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  getOpportunityActivities = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      const activities = await this.service.getOpportunityActivities(id);
      res.json(activities);
    } catch (error) {
      console.error('Error getting opportunity activities:', error);
      if (error.message === 'Oportunidade não encontrada') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Pipeline Activities
  getActivitiesByClinic = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.query.clinic_id as string);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: 'clinic_id deve ser um número' });
      }

      const activities = await this.service.getActivitiesByClinic(clinicId);
      res.json(activities);
    } catch (error) {
      console.error('Error getting pipeline activities:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  getActivityById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      const activity = await this.service.getActivityById(id);
      res.json(activity);
    } catch (error) {
      console.error('Error getting pipeline activity:', error);
      if (error.message === 'Atividade não encontrada') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  createActivity = async (req: Request, res: Response) => {
    try {
      const validatedData = insertPipelineActivitySchema.parse(req.body);
      const activity = await this.service.createActivity(validatedData);
      res.status(201).json(activity);
    } catch (error) {
      console.error('Error creating pipeline activity:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      }
      if (error.message.includes('não encontrad') || error.message.includes('não pertence')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  updateActivity = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      const validatedData = updatePipelineActivitySchema.parse(req.body);
      const activity = await this.service.updateActivity(id, validatedData);
      res.json(activity);
    } catch (error) {
      console.error('Error updating pipeline activity:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      }
      if (error.message === 'Atividade não encontrada') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  deleteActivity = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      await this.service.deleteActivity(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting pipeline activity:', error);
      if (error.message === 'Atividade não encontrada') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  completeActivity = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID deve ser um número' });
      }

      const result = await this.service.completeActivity(id);
      res.json(result);
    } catch (error) {
      console.error('Error completing pipeline activity:', error);
      if (error.message === 'Atividade não encontrada') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
}
