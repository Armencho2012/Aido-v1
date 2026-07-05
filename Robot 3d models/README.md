# Robot 3D Models

This folder contains 3D model files for the AIDO robot project.

## Included files

- `Aido.stl`
- `Aido.fbx`
- `back.stl`
- `back.fbx`

## Description

- `Aido.stl` / `Aido.fbx`:
  - Main robot body model.
  - Use these files for visualization, rendering, or 3D printing the robot enclosure.

- `back.stl` / `back.fbx`:
  - Secondary part for the robot, likely the back cover or rear panel.
  - Use this model together with the main body for complete assembly.

## Notes

- `STL` files are ideal for 3D printing and slicing.
- `FBX` files are useful for CAD, animation, and 3D editing applications.
- Keep model scale and orientation consistent when importing into CAD or slicing software.

## Recommended workflow

1. Open the `FBX` file if you need to inspect or edit the model in Blender, Fusion 360, or other 3D tools.
2. Export or validate the `STL` file for 3D printing.
3. Use the back part as a separate printed/rear component.

## Tips

- Check that the model units are correct in your slicer before printing.
- If you need to modify the design, start from `Aido.fbx` or `back.fbx` and then export a new `STL`.
