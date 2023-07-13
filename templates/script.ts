import { Script } from '@galacean/engine';
/**
 * 使用时再重写，性能可以得到提升
 */
export default class extends Script {
  /**
   * 第一次触发可用状态时调用,只调用一次
   */
  // onAwake() {}

  /**
   * 触发为可用状态时调用。
   */
  // onEnable() {}

  /**
   * 第一次执行帧级循环前调用，只调用一次。
   */
  // onStart() {}

  /**
   * 主更新，逐帧调用。
   * @param deltaTime - 帧间隔时间
   */
  onUpdate(deltaTime: number) {}

  /**
   * 延迟更新，在执行内部动画逻辑后调用，逐帧调用。
   */
  // onLateUpdate() {}

  /**
   * 触发为禁用状态时调用。
   */
  // onDisable() {}

  /**
   * 在被销毁帧的最后调用。
   */
  // onDestroy() {}
}
