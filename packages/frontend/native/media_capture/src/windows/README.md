# Windows 音频录制

本模块使用 Windows Audio Session API (WASAPI) 提供 Windows 专用音频录制功能。

## 功能

- **麦克风活动检测**：监控应用何时使用麦克风
- **进程识别**：识别哪个进程在使用麦克风
- **实时通知**：麦克风开始/停止使用时回调

## 用法

### MicrophoneListener

`MicrophoneListener` 类提供麦克风使用情况的实时监控：

```typescript
import { MicrophoneListener } from '@affine/native';

const listener = new MicrophoneListener((isRunning: boolean, processName: string) => {
  console.log(`Microphone ${isRunning ? 'started' : 'stopped'} by ${processName}`);
});
```

更多 API 与限制见本模块源码。
