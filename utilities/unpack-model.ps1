param ( [Parameter(Mandatory=$true)] [string]$File, [Parameter(Mandatory=$true)] [string]$Destination, [Parameter(Mandatory=$true)] [string]$FinalDestination, [Parameter(Mandatory=$true)] [string]$Prefix  )
Expand-Archive -Path $File -DestinationPath $Destination -Force
$files = Get-ChildItem -Path ($Destination + '\*') -Include *.tflite
$ModelFile = $files[0].FullName
$files = Get-ChildItem -Path ($Destination + '\*') -Include *.txt
$LabelFile = $files[0].FullName
python 'D:\OneDrive\OneDrive - HvA\Vakken\AI\metadata_adder\metadata_writer_for_image_classifier.py' --model_file=$ModeLFile --label_file=$LabelFile --export_directory=$FinalDestination --model_name=$Prefix
