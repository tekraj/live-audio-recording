import { Test, TestingModule } from '@nestjs/testing';
import { AudioGateway } from './audio.gateway';

describe('AudioGateway', () => {
  let gateway: AudioGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioGateway],
    }).compile();

    gateway = module.get<AudioGateway>(AudioGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
