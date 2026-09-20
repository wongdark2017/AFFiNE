import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import {
  ActionForbidden,
  BadRequest,
  getRequestCookie,
  Throttle,
} from '../../base';
import { CSRF_COOKIE_NAME } from '../../core/auth/input';
import { Admin } from '../../core/common/admin-guard';
import {
  CONNECTION_TEST_ERRORS,
  ConnectionTestError,
  testOpenAICompatibleConnection,
} from './providers/openai-compatible-connection';
import {
  fetchOpenAICompatibleModels,
  MODEL_DISCOVERY_ERRORS,
  ModelDiscoveryError,
} from './providers/openai-compatible-models';

@Admin()
@Throttle('strict')
@Controller('/api/copilot/admin')
export class CopilotAdminController {
  @Post('/test-connection')
  @HttpCode(200)
  async testConnection(
    @Req() req: Request,
    @Body() body: unknown
  ): Promise<{ model: string; latencyMs: number }> {
    this.assertRequestAuthorized(req);
    try {
      return await testOpenAICompatibleConnection(body);
    } catch (error) {
      throw new BadRequest(
        error instanceof ConnectionTestError
          ? error.message
          : CONNECTION_TEST_ERRORS.requestFailed
      );
    }
  }

  @Post('/models')
  @HttpCode(200)
  async models(
    @Req() req: Request,
    @Body() body: unknown
  ): Promise<{ models: string[] }> {
    this.assertRequestAuthorized(req);
    try {
      return { models: await fetchOpenAICompatibleModels(body) };
    } catch (error) {
      throw new BadRequest(
        error instanceof ModelDiscoveryError
          ? error.message
          : MODEL_DISCOVERY_ERRORS.requestFailed
      );
    }
  }

  private assertRequestAuthorized(req: Request) {
    // AuthGuard has already validated bearer sessions. Cookie sessions need
    // the same double-submit token used by the auth controller.
    if (req.authType === 'jwt') return;
    if (req.authType === 'session') {
      const csrfCookie = getRequestCookie(req, CSRF_COOKIE_NAME);
      const csrfHeader = req.get('x-affine-csrf-token');
      if (csrfHeader && csrfCookie && csrfCookie === csrfHeader) return;
    }
    throw new ActionForbidden();
  }
}
