import { catchAsync } from "@utils/catchAsync";
import User from "@models/User";
import { AppError } from "@utils/AppError";
import ERROR_MESSAGES from "@config/errorMessages";
import { signToken } from "@utils/jwt";

export class UserController {
  public static register = catchAsync(async (req, res) => {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new AppError(ERROR_MESSAGES.USER.EMAIL_EXISTS, 400);

    const user = await User.create({ name, email, password, role });
    const token = signToken({ id: user._id });
    res.status(201).json({ user, token });
  });

  public static login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
      throw new AppError(ERROR_MESSAGES.USER.EMAIL_PASS_REQ, 400);

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError(ERROR_MESSAGES.USER.INVALID_EMAIL_PASS, 401);
    }

    const token = signToken({ id: user._id });
    res.status(200).json({ user, token });
  });

  public static getMe = catchAsync(async (req, res) => {
    res.status(200).json(req.user);
  });

  public static getAllUsers = catchAsync(async (req, res) => {
    const users = await User.find();
    res.status(200).json(users);
  });
}
