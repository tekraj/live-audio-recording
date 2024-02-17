import { Test, TestingModule } from '@nestjs/testing';
import { AudioGatewayGateway } from './audio-gateway.gateway';

describe('AudioGatewayGateway', () => {
  let gateway: AudioGatewayGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioGatewayGateway],
    }).compile();

    gateway = module.get<AudioGatewayGateway>(AudioGatewayGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
