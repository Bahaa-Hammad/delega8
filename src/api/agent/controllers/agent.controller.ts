import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { AgentService } from '@agents/services/agent.service';
import {
  CreateAgentDto,
  ImportAgentTreeDto,
} from '@agents/dto/create-agent.dto';
import { UpdateAgentDto } from '@agents/dto/update-agent.dto';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { AuthenticatedRequest } from '@auth/types';
import { TemplateAgentService } from '@agents/services/template.service';
import { UserService } from '@user/user.service';
import { AdminGuard } from '@src/api/admin/admin.guard';

@Controller('agents')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly templateAgentService: TemplateAgentService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createAgentDto: CreateAgentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.agentService.create(user.id, createAgentDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('from-template')
  async createFromTemplate(
    @Body() data: ImportAgentTreeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const userEntity = await this.userService.findFullOne(user.id);
    return this.templateAgentService.createAgentRecursively(data, userEntity);
  }
  @UseGuards(JwtAuthGuard)
  @Post(':id/publish-requests')
  async publishRequests(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const userEntity = await this.userService.findFullOne(user.id);
    return this.templateAgentService.requestPublishAgent(id, userEntity);
  }

  // publish, should be called by admin
  @UseGuards(AdminGuard)
  @Post(':id/publish')
  async publish(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const agent = await this.agentService.findSingleAgentById(id);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return this.templateAgentService.publishAgentAndSubagents(
      agent.id,
      agent.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('templates/:id')
  findOneTemplate(@Param('id') id: string) {
    return this.templateAgentService.findOneTemplate(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/clone')
  async cloneToUser(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    const userEntity = await this.userService.findFullOne(user.id);
    return this.templateAgentService.cloneToUser(id, userEntity);
  }

  @UseGuards(JwtAuthGuard)
  @Get('templates')
  findAllTemplates() {
    return this.templateAgentService.findAllTemplates();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.agentService.findWithAllChildren(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.agentService.update(id, updateAgentDto, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.agentService.remove(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.agentService.findAll(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/drawable')
  getDrawableAgent(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.agentService.getDrawableAgent(id, user.id);
  }
}
