class ScoutCli < Formula
    desc "Scout CLI for managing AI workflows"
    homepage "https://github.com/scoutos/scout-cli"
    version "1.0.0"  # Change to match your release version
  
    if OS.mac?
      url "https://github.com/scoutos/cli/releases/download/latest/scout-cli-macos"
      sha256 "7dcffbdee67bd213c49978bebc7022939a87bfa1fa06a624667fff2a9025fdc9"
    elsif OS.linux?
      url "https://github.com/scoutos/scout-cli/releases/download/v1.0.0/scout-cli-linux"
      sha256 "REPLACE_WITH_YOUR_LINUX_SHA256"
    end
  
    def install
      bin.install "scout-cli-macos" => "scout" if OS.mac?
      bin.install "scout-cli-linux" => "scout" if OS.linux?
    end
  
    test do
      system "#{bin}/scout", "--help"
    end
  end
  