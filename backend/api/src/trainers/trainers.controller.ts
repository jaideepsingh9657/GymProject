import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { AuthUser, CurrentUser, RequirePermissions } from "../common/decorators";
import { AssignMemberDto, CreateTrainerDto, UpdateTrainerDto } from "./dto/trainer.dto";
import { TrainersService } from "./trainers.service";

@Controller("trainers")
export class TrainersController {
  constructor(private readonly trainers: TrainersService) {}

  @RequirePermissions("trainers:read") @Get()
  list(@CurrentUser() u: AuthUser) { return this.trainers.list(u); }

  @RequirePermissions("trainers:read") @Get(":id")
  get(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) { return this.trainers.get(u, id); }

  @RequirePermissions("trainers:write") @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateTrainerDto) { return this.trainers.create(u, dto); }

  @RequirePermissions("trainers:write") @Patch(":id")
  update(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateTrainerDto) { return this.trainers.update(u, id, dto); }

  @RequirePermissions("trainers:assign") @HttpCode(200) @Post(":id/assignments")
  assign(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: AssignMemberDto) { return this.trainers.assign(u, id, dto); }

  @RequirePermissions("trainers:assign") @HttpCode(200) @Post(":id/assignments/:assignmentId/end")
  end(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Param("assignmentId", ParseUUIDPipe) a: string) { return this.trainers.endAssignment(u, id, a); }
}
