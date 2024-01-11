export default abstract class Command {
  static command: string;
  abstract name: string;
  abstract callback(...args: any[]): any;
}
