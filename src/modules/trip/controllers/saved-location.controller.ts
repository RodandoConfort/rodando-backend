import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { SavedLocationResponseDto, SavedLocationService } from '../services/saved-location.service';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { GetUserId } from 'src/modules/auth/decorators/get-user-id.decorator';
import { SavedLocationsQueryDto } from '../dtos/saved_locations/saved-locations-query.dto';
import { PaginationMetaDto } from 'src/common/dto/pagination-meta.dto';
import { CreateSavedLocationDto } from '../dtos/saved_locations/create-saved-location.dto';
import { UpdateSavedLocationDto } from '../dtos/saved_locations/update-saved-location.dto';
import { SetFavoriteDto } from '../dtos/saved_locations/set-favorite.dto';

@ApiTags('saved-locations')
@Controller('saved-locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavedLocationController {
  constructor(private readonly savedLocationService: SavedLocationService) {}

  @Get()
  @ApiOperation({ summary: 'List saved locations for the authenticated user' })
  @ApiOkResponse({
    description: 'Saved locations list with pagination',
    type: ApiResponseDto,
  })
  list(
    @GetUserId() userId: string,
    @Query() q: SavedLocationsQueryDto & { page?: number; limit?: number },
  ): Promise<ApiResponseDto<SavedLocationResponseDto[], PaginationMetaDto>> {
    return this.savedLocationService.findAllForUser(userId, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get saved location by id (owner or global)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ApiResponseDto })
  getById(
    @GetUserId() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponseDto<SavedLocationResponseDto>> {
    return this.savedLocationService.getByIdForUser(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create saved location for authenticated user' })
  @ApiCreatedResponse({
    description: 'Saved location created',
    type: ApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Home/work already exists' })
  create(
    @GetUserId() userId: string,
    @Body() dto: CreateSavedLocationDto,
  ): Promise<ApiResponseDto<SavedLocationResponseDto>> {
    return this.savedLocationService.createForUser(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update saved location (owner only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Home/work already exists' })
  update(
    @GetUserId() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSavedLocationDto,
  ): Promise<ApiResponseDto<SavedLocationResponseDto>> {
    return this.savedLocationService.updateForUser(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete saved location (owner only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ApiResponseDto })
  remove(
    @GetUserId() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponseDto<{ id: string }>> {
    return this.savedLocationService.deleteForUser(userId, id);
  }

  @Patch(':id/favorite')
  @ApiOperation({ summary: 'Toggle favorite (owner only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ApiResponseDto })
  setFavorite(
    @GetUserId() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetFavoriteDto,
  ): Promise<ApiResponseDto<SavedLocationResponseDto>> {
    return this.savedLocationService.setFavoriteForUser(userId, id, dto.isFavorite);
  }

  @Post(':id/used')
  @ApiOperation({ summary: 'Mark saved location as used (updates last_used_at)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ApiResponseDto })
  markUsed(
    @GetUserId() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponseDto<{ id: string; lastUsedAt: string }>> {
    return this.savedLocationService.markUsedForUser(userId, id);
  }
}