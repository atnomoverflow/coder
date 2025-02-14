import Button from "@mui/material/Button"
import { makeStyles } from "@mui/styles"
import { Avatar } from "components/Avatar/Avatar"
import { AgentRow } from "components/Resources/AgentRow"
import { WorkspaceBuildLogs } from "components/WorkspaceBuildLogs/WorkspaceBuildLogs"
import {
  ActiveTransition,
  WorkspaceBuildProgress,
} from "components/WorkspaceBuildProgress/WorkspaceBuildProgress"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import * as TypesGen from "../../api/typesGenerated"
import { Alert, AlertDetail } from "../Alert/Alert"
import { BuildsTable } from "../BuildsTable/BuildsTable"
import { Margins } from "../Margins/Margins"
import { Resources } from "../Resources/Resources"
import { Stack } from "../Stack/Stack"
import { WorkspaceActions } from "../WorkspaceActions/WorkspaceActions"
import { WorkspaceDeletedBanner } from "../WorkspaceDeletedBanner/WorkspaceDeletedBanner"
import { WorkspaceStats } from "../WorkspaceStats/WorkspaceStats"
import {
  FullWidthPageHeader,
  PageHeaderActions,
  PageHeaderTitle,
  PageHeaderSubtitle,
} from "components/PageHeader/FullWidthPageHeader"
import { TemplateVersionWarnings } from "components/TemplateVersionWarnings/TemplateVersionWarnings"
import { ErrorAlert } from "components/Alert/ErrorAlert"
import { ImpendingDeletionBanner } from "components/WorkspaceDeletion"
import { useLocalStorage } from "hooks"
import { ChooseOne, Cond } from "components/Conditionals/ChooseOne"
import AlertTitle from "@mui/material/AlertTitle"

export enum WorkspaceErrors {
  GET_BUILDS_ERROR = "getBuildsError",
  BUILD_ERROR = "buildError",
  CANCELLATION_ERROR = "cancellationError",
}
export interface WorkspaceProps {
  scheduleProps: {
    onDeadlinePlus: (hours: number) => void
    onDeadlineMinus: (hours: number) => void
    maxDeadlineIncrease: number
    maxDeadlineDecrease: number
  }
  handleStart: () => void
  handleStop: () => void
  handleRestart: () => void
  handleDelete: () => void
  handleUpdate: () => void
  handleCancel: () => void
  handleSettings: () => void
  handleChangeVersion: () => void
  isUpdating: boolean
  isRestarting: boolean
  workspace: TypesGen.Workspace
  resources?: TypesGen.WorkspaceResource[]
  builds?: TypesGen.WorkspaceBuild[]
  templateWarnings?: TypesGen.TemplateVersionWarning[]
  canUpdateWorkspace: boolean
  canUpdateTemplate: boolean
  canChangeVersions: boolean
  hideSSHButton?: boolean
  hideVSCodeDesktopButton?: boolean
  workspaceErrors: Partial<Record<WorkspaceErrors, Error | unknown>>
  buildInfo?: TypesGen.BuildInfoResponse
  sshPrefix?: string
  template?: TypesGen.Template
  quota_budget?: number
  failedBuildLogs: TypesGen.ProvisionerJobLog[] | undefined
  handleBuildRetry: () => void
}

/**
 * Workspace is the top-level component for viewing an individual workspace
 */
export const Workspace: FC<React.PropsWithChildren<WorkspaceProps>> = ({
  scheduleProps,
  handleStart,
  handleStop,
  handleRestart,
  handleDelete,
  handleUpdate,
  handleCancel,
  handleSettings,
  handleChangeVersion,
  workspace,
  isUpdating,
  isRestarting,
  resources,
  builds,
  canUpdateWorkspace,
  canUpdateTemplate,
  canChangeVersions,
  workspaceErrors,
  hideSSHButton,
  hideVSCodeDesktopButton,
  buildInfo,
  sshPrefix,
  template,
  quota_budget,
  failedBuildLogs,
  handleBuildRetry,
  templateWarnings,
}) => {
  const styles = useStyles()
  const navigate = useNavigate()
  const serverVersion = buildInfo?.version || ""
  const { t } = useTranslation("workspacePage")
  const { saveLocal, getLocal } = useLocalStorage()

  const buildError = Boolean(workspaceErrors[WorkspaceErrors.BUILD_ERROR]) && (
    <ErrorAlert
      error={workspaceErrors[WorkspaceErrors.BUILD_ERROR]}
      dismissible
    />
  )

  const cancellationError = Boolean(
    workspaceErrors[WorkspaceErrors.CANCELLATION_ERROR],
  ) && (
    <ErrorAlert
      error={workspaceErrors[WorkspaceErrors.CANCELLATION_ERROR]}
      dismissible
    />
  )

  let transitionStats: TypesGen.TransitionStats | undefined = undefined
  if (template !== undefined) {
    transitionStats = ActiveTransition(template, workspace)
  }
  return (
    <>
      <FullWidthPageHeader>
        <Stack direction="row" spacing={3} alignItems="center">
          <Avatar
            size="md"
            src={workspace.template_icon}
            variant={workspace.template_icon ? "square" : undefined}
            fitImage={Boolean(workspace.template_icon)}
          >
            {workspace.name}
          </Avatar>
          <div>
            <PageHeaderTitle>{workspace.name}</PageHeaderTitle>
            <PageHeaderSubtitle>{workspace.owner_name}</PageHeaderSubtitle>
          </div>
        </Stack>

        <WorkspaceStats
          workspace={workspace}
          quota_budget={quota_budget}
          handleUpdate={handleUpdate}
          canUpdateWorkspace={canUpdateWorkspace}
          maxDeadlineDecrease={scheduleProps.maxDeadlineDecrease}
          maxDeadlineIncrease={scheduleProps.maxDeadlineIncrease}
          onDeadlineMinus={scheduleProps.onDeadlineMinus}
          onDeadlinePlus={scheduleProps.onDeadlinePlus}
        />

        <PageHeaderActions>
          <WorkspaceActions
            workspaceStatus={workspace.latest_build.status}
            isOutdated={workspace.outdated}
            handleStart={handleStart}
            handleStop={handleStop}
            handleRestart={handleRestart}
            handleDelete={handleDelete}
            handleUpdate={handleUpdate}
            handleCancel={handleCancel}
            handleSettings={handleSettings}
            handleChangeVersion={handleChangeVersion}
            canChangeVersions={canChangeVersions}
            isUpdating={isUpdating}
            isRestarting={isRestarting}
          />
        </PageHeaderActions>
      </FullWidthPageHeader>

      <Margins className={styles.content}>
        <Stack
          direction="column"
          className={styles.firstColumnSpacer}
          spacing={4}
        >
          {buildError}
          {cancellationError}

          <ChooseOne>
            <Cond condition={workspace.latest_build.status === "deleted"}>
              <WorkspaceDeletedBanner
                handleClick={() => navigate(`/templates`)}
              />
            </Cond>
            <Cond>
              {/* <ImpendingDeletionBanner/> determines its own visibility */}
              <ImpendingDeletionBanner
                workspace={workspace}
                shouldRedisplayBanner={
                  getLocal("dismissedWorkspace") !== workspace.id
                }
                onDismiss={() => saveLocal("dismissedWorkspace", workspace.id)}
              />
            </Cond>
          </ChooseOne>

          <TemplateVersionWarnings warnings={templateWarnings} />

          {failedBuildLogs && (
            <Stack>
              <Alert
                severity="error"
                actions={
                  canUpdateTemplate && (
                    <Button
                      key={0}
                      onClick={handleBuildRetry}
                      variant="text"
                      size="small"
                    >
                      {t("actionButton.retryDebugMode")}
                    </Button>
                  )
                }
              >
                <AlertTitle>Workspace build failed</AlertTitle>
                <AlertDetail>{workspace.latest_build.job.error}</AlertDetail>
              </Alert>
              <WorkspaceBuildLogs logs={failedBuildLogs} />
            </Stack>
          )}

          {transitionStats !== undefined && (
            <WorkspaceBuildProgress
              workspace={workspace}
              transitionStats={transitionStats}
            />
          )}

          {typeof resources !== "undefined" && resources.length > 0 && (
            <Resources
              resources={resources}
              agentRow={(agent) => (
                <AgentRow
                  key={agent.id}
                  agent={agent}
                  workspace={workspace}
                  sshPrefix={sshPrefix}
                  showApps={canUpdateWorkspace}
                  hideSSHButton={hideSSHButton}
                  hideVSCodeDesktopButton={hideVSCodeDesktopButton}
                  serverVersion={serverVersion}
                  onUpdateAgent={handleUpdate} // On updating the workspace the agent version is also updated
                />
              )}
            />
          )}

          {workspaceErrors[WorkspaceErrors.GET_BUILDS_ERROR] ? (
            <ErrorAlert
              error={workspaceErrors[WorkspaceErrors.GET_BUILDS_ERROR]}
            />
          ) : (
            <BuildsTable builds={builds} />
          )}
        </Stack>
      </Margins>
    </>
  )
}

const spacerWidth = 300

export const useStyles = makeStyles((theme) => {
  return {
    content: {
      marginTop: theme.spacing(4),
    },

    statusBadge: {
      marginLeft: theme.spacing(2),
    },

    actions: {
      [theme.breakpoints.down("md")]: {
        flexDirection: "column",
      },
    },

    firstColumnSpacer: {
      flex: 2,
    },

    secondColumnSpacer: {
      flex: `0 0 ${spacerWidth}px`,
    },

    layout: {
      alignItems: "flex-start",
    },

    main: {
      width: "100%",
    },

    timelineContents: {
      margin: 0,
    },
    logs: {
      border: `1px solid ${theme.palette.divider}`,
    },

    errorDetails: {
      color: theme.palette.text.secondary,
      fontSize: 12,
    },

    fullWidth: {
      width: "100%",
    },
  }
})
