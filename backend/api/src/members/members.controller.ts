import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { AuthUser, CurrentUser, RequirePermissions } from "../common/decorators";
import { CreateMemberDto, ListMembersDto, UpdateMemberDto } from "./dto/member.dto";
import { MembersService } from "./members.service";

@Controller("members")
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @RequirePermissions("members:read") @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: ListMembersDto) { return this.members.list(u, q); }

  @RequirePermissions("members:read") @Get(":id")
  get(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) { return this.members.get(u, id); }

  @RequirePermissions("members:write") @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateMemberDto) { return this.members.create(u, dto); }

  @RequirePermissions("members:write") @Patch(":id")
  update(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateMemberDto) { return this.members.update(u, id, dto); }
}
